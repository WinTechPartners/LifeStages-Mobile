import Capacitor
import StoreKit

@available(iOS 15.0, *)
@objc(LifeStagesStoreKitPlugin)
public class LifeStagesStoreKitPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "LifeStagesStoreKitPlugin"
    public let jsName = "LifeStagesStoreKit"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getProducts", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "purchase", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getSubscription", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restore", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "manageSubscriptions", returnType: CAPPluginReturnPromise)
    ]
    private let ids: Set<String> = ["001", "com.bibleforlifestages.premium.yearly"]
    private var updates: Task<Void, Never>?

    public override func load() {
        updates = Task { [weak self] in
            for await result in Transaction.updates {
                guard let self else { return }
                guard case .verified(let transaction) = result, self.ids.contains(transaction.productID) else { continue }
                await transaction.finish()
                let value = await self.subscription()
                self.notifyListeners("subscriptionChanged", data: value)
            }
        }
    }
    deinit { updates?.cancel() }

    private func subscription() async -> [String: Any] {
        var selected: (Transaction, String)?
        for await result in Transaction.currentEntitlements {
            guard case .verified(let transaction) = result,
                  ids.contains(transaction.productID), transaction.revocationDate == nil,
                  !transaction.isUpgraded, let expiry = transaction.expirationDate, expiry > Date() else { continue }
            if selected == nil || expiry > selected!.0.expirationDate! { selected = (transaction, result.jwsRepresentation) }
        }
        guard let (transaction, signed) = selected else {
            return ["status":"none", "productId":NSNull(), "expiresAt":NSNull(), "isTrialing":false, "willRenew":false]
        }
        var renews = false
        var trial = false
        if let product = try? await Product.products(for: [transaction.productID]).first,
           let details = product.subscription {
            trial = transaction.offerType == .introductory && details.introductoryOffer?.paymentMode == .freeTrial
            if let statuses = try? await details.status {
                for status in statuses {
                    if case .verified(let renewal) = status.renewalInfo,
                       renewal.originalTransactionID == transaction.originalID { renews = renewal.willAutoRenew }
                }
            }
        }
        return ["status":trial ? "trialing":"active", "productId":transaction.productID,
                "expiresAt":transaction.expirationDate!.timeIntervalSince1970 * 1000,
                "isTrialing":trial, "willRenew":renews, "signedTransaction":signed]
    }
    @objc func getProducts(_ call: CAPPluginCall) {
        Task {
            do {
                let products = try await Product.products(for: Array(ids))
                call.resolve(["products":products.filter { $0.type == .autoRenewable }.map { product in
                    ["id":product.id, "title":product.displayName, "description":product.description,
                     "price":product.displayPrice, "priceAmount":NSDecimalNumber(decimal:product.price).doubleValue,
                     "currency":product.priceFormatStyle.currencyCode,
                     "period":product.id.hasSuffix(".yearly") ? "yearly":"monthly"] as [String:Any]
                }])
            } catch { call.reject("Apple could not load subscriptions.", "STORE_UNAVAILABLE") }
        }
    }
    @objc func purchase(_ call: CAPPluginCall) {
        guard let id = call.getString("productId"), ids.contains(id) else { call.reject("Unknown subscription.", "INVALID_PRODUCT"); return }
        Task {
            do {
                guard let product = try await Product.products(for:[id]).first else { call.reject("Subscription unavailable.", "PRODUCT_UNAVAILABLE"); return }
                switch try await product.purchase() {
                case .success(let result):
                    guard case .verified(let transaction) = result, ids.contains(transaction.productID) else {
                        call.reject("Apple could not verify the purchase.", "UNVERIFIED_TRANSACTION"); return
                    }
                    await transaction.finish()
                    call.resolve(["outcome":"purchased", "subscription":await subscription()])
                case .userCancelled: call.resolve(["outcome":"cancelled"])
                case .pending: call.resolve(["outcome":"pending"])
                @unknown default: call.reject("Unexpected purchase result.", "STORE_UNAVAILABLE")
                }
            } catch { call.reject("Apple could not complete the purchase.", "STORE_UNAVAILABLE") }
        }
    }
    @objc func getSubscription(_ call: CAPPluginCall) { Task { call.resolve(await subscription()) } }
    @objc func restore(_ call: CAPPluginCall) {
        Task {
            do { try await AppStore.sync(); call.resolve(await subscription()) }
            catch { call.reject("Apple could not restore purchases.", "RESTORE_FAILED") }
        }
    }
    @objc func manageSubscriptions(_ call: CAPPluginCall) {
        Task { @MainActor in
            guard let scene = self.bridge?.viewController?.view.window?.windowScene else { call.reject("Subscription settings unavailable."); return }
            do { try await AppStore.showManageSubscriptions(in: scene); call.resolve() }
            catch { call.reject("Apple could not open subscription settings.") }
        }
    }
}
