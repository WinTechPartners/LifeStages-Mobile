package com.bibleforlifestages;

import android.os.Handler;
import android.os.Looper;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.android.billingclient.api.*;
import java.util.*;

@CapacitorPlugin(name="LifeStagesGoogleBilling")
public class LifeStagesGoogleBillingPlugin extends Plugin implements PurchasesUpdatedListener {
  private BillingClient billing;
  private PluginCall purchaseCall;
  private final Handler main = new Handler(Looper.getMainLooper());
  private final List<Runnable> connected = new ArrayList<>();
  private final List<PluginCall> waiting = new ArrayList<>();
  private boolean connecting;
  private static final List<String> IDS = Arrays.asList("premium_monthly", "premium_yearly");
  @Override public void load() {
    billing = BillingClient.newBuilder(getContext()).setListener(this)
      .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
      .enableAutoServiceReconnection().build();
  }
  private void ready(PluginCall call, Runnable action) {
    main.post(() -> {
      if(billing.isReady()) { action.run(); return; }
      connected.add(action); waiting.add(call);
      if(connecting) return;
      connecting=true;
      billing.startConnection(new BillingClientStateListener() {
        public void onBillingServiceDisconnected() { }
        public void onBillingSetupFinished(BillingResult result) {
          main.post(() -> {
            connecting=false;
            List<Runnable> actions=new ArrayList<>(connected);
            List<PluginCall> calls=new ArrayList<>(waiting);
            connected.clear(); waiting.clear();
            if(result.getResponseCode()!=BillingClient.BillingResponseCode.OK) {
              for(PluginCall item:calls) item.reject("Google Play billing could not connect. Check your Play Store sign-in and retry.");
            } else for(Runnable item:actions) item.run();
          });
        }
      });
    });
  }
  private ProductDetails.SubscriptionOfferDetails baseOffer(ProductDetails detail) {
    if(detail.getSubscriptionOfferDetails()==null) return null;
    for(ProductDetails.SubscriptionOfferDetails offer:detail.getSubscriptionOfferDetails())
      if(offer.getOfferId()==null) return offer;
    return null;
  }
  private QueryProductDetailsParams query(List<String> ids) {
    List<QueryProductDetailsParams.Product> products=new ArrayList<>();
    for(String id:ids) products.add(QueryProductDetailsParams.Product.newBuilder().setProductId(id).setProductType(BillingClient.ProductType.SUBS).build());
    return QueryProductDetailsParams.newBuilder().setProductList(products).build();
  }
  @PluginMethod public void getProducts(PluginCall call) {
    ready(call,()->billing.queryProductDetailsAsync(query(IDS),(result,details)->{
      if(result.getResponseCode()!=BillingClient.BillingResponseCode.OK) {call.reject("Google Play could not load subscription plans.");return;}
      JSArray products=new JSArray();
      for(ProductDetails detail:details.getProductDetailsList()) {
        ProductDetails.SubscriptionOfferDetails offer=baseOffer(detail);
        if(offer==null) continue;
        List<ProductDetails.PricingPhase> phases=offer.getPricingPhases().getPricingPhaseList();
        if(phases.isEmpty()) continue;
        ProductDetails.PricingPhase phase=phases.get(phases.size()-1);
        JSObject product=new JSObject();
        product.put("id",detail.getProductId());product.put("title",detail.getTitle());product.put("description",detail.getDescription());
        product.put("price",phase.getFormattedPrice());product.put("priceAmount",phase.getPriceAmountMicros()/1000000.0);product.put("currency",phase.getPriceCurrencyCode());
        product.put("period",detail.getProductId().endsWith("yearly")?"yearly":"monthly");products.put(product);
      }
      JSObject response=new JSObject();response.put("products",products);call.resolve(response);
    }));
  }
  @PluginMethod public void getPurchases(PluginCall call) {
    ready(call,()->billing.queryPurchasesAsync(QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.SUBS).build(),(result,purchases)->{
      if(result.getResponseCode()!=BillingClient.BillingResponseCode.OK){call.reject("Google Play could not restore subscriptions.");return;}
      JSArray values=new JSArray();
      for(Purchase purchase:purchases) for(String id:purchase.getProducts()) if(IDS.contains(id)) {
        JSObject item=new JSObject();item.put("productId",id);item.put("purchaseToken",purchase.getPurchaseToken());
        item.put("pending",purchase.getPurchaseState()!=Purchase.PurchaseState.PURCHASED);values.put(item);
      }
      JSObject response=new JSObject();response.put("purchases",values);call.resolve(response);
    }));
  }
  @PluginMethod public void purchase(PluginCall call) {
    String id=call.getString("productId");
    if(!IDS.contains(id)){call.reject("Unknown Google Play plan.");return;}
    ready(call,()->{
      if(purchaseCall!=null){call.reject("A purchase is already in progress.");return;}
      billing.queryProductDetailsAsync(query(Collections.singletonList(id)),(result,details)->{
        if(result.getResponseCode()!=BillingClient.BillingResponseCode.OK || details.getProductDetailsList().isEmpty()){call.reject("Google Play has not loaded this plan. Please retry.");return;}
        ProductDetails detail=details.getProductDetailsList().get(0);
        ProductDetails.SubscriptionOfferDetails offer=baseOffer(detail);
        if(offer==null){call.reject("This subscription base plan is unavailable.");return;}
        main.post(()->{
          if(purchaseCall!=null){call.reject("A purchase is already in progress.");return;}
          purchaseCall=call;
          BillingFlowParams.ProductDetailsParams product=BillingFlowParams.ProductDetailsParams.newBuilder().setProductDetails(detail).setOfferToken(offer.getOfferToken()).build();
          BillingResult launch=billing.launchBillingFlow(getActivity(),BillingFlowParams.newBuilder().setProductDetailsParamsList(Collections.singletonList(product)).build());
          if(launch.getResponseCode()!=BillingClient.BillingResponseCode.OK){purchaseCall=null;call.reject("Google Play could not open checkout. Retry or restore an existing purchase.");}
        });
      });
    });
  }
  @Override public void onPurchasesUpdated(BillingResult result,List<Purchase> purchases) {
    main.post(()->{
      PluginCall call=purchaseCall;purchaseCall=null;
      if(call==null) return;
      if(result.getResponseCode()==BillingClient.BillingResponseCode.USER_CANCELED){JSObject value=new JSObject();value.put("outcome","cancelled");call.resolve(value);return;}
      if(result.getResponseCode()!=BillingClient.BillingResponseCode.OK || purchases==null){call.reject("Google Play could not finish checkout. Please restore or retry.");return;}
      for(Purchase purchase:purchases) if(!Collections.disjoint(purchase.getProducts(),IDS)) {
        JSObject value=new JSObject();value.put("outcome",purchase.getPurchaseState()==Purchase.PurchaseState.PURCHASED?"purchased":"pending");
        value.put("purchaseToken",purchase.getPurchaseToken());call.resolve(value);return;
      }
      call.reject("Google Play did not return the selected subscription.");
    });
  }
  @Override protected void handleOnDestroy() {if(billing!=null) billing.endConnection();}
}
