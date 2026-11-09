import Capacitor
import WebKit
import Darwin

class LifeStagesBridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        if #available(iOS 15.0, *) { bridge?.registerPluginInstance(LifeStagesStoreKitPlugin()) }
    }

    // Only enabled by the clean CI simulator process, never by app users.
    override func webViewConfiguration(for instanceConfiguration: InstanceConfiguration) -> WKWebViewConfiguration {
        let configuration = super.webViewConfiguration(for: instanceConfiguration)
        if ProcessInfo.processInfo.environment["LIFESTAGES_STARTUP_PROBE"] == "1" {
            let source = "window.__lifeStagesStartupErrors=[];window.addEventListener('error',function(e){window.__lifeStagesStartupErrors.push(String(e.message || 'Asset failed: '+(e.target && e.target.src)));},true);window.addEventListener('unhandledrejection',function(e){window.__lifeStagesStartupErrors.push(String(e.reason));});"
            configuration.userContentController.addUserScript(WKUserScript(source: source, injectionTime: .atDocumentStart, forMainFrameOnly: true))
        }
        return configuration
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        guard ProcessInfo.processInfo.environment["LIFESTAGES_STARTUP_PROBE"] == "1" else { return }
        for delay in [12.0, 35.0, 65.0] {
        DispatchQueue.main.asyncAfter(deadline: .now() + delay) { [weak self] in
            guard let self, let webView = self.webView else { print("LIFESTAGES_STARTUP_PROBE: missing WebView"); fflush(stdout); return }
            webView.evaluateJavaScript("JSON.stringify({url:location.href,readyState:document.readyState,text:document.body.innerText.slice(0,1600),storeKitAvailable:!!window.Capacitor?.isPluginAvailable('LifeStagesStoreKit'),errors:window.__lifeStagesStartupErrors||[]})") { result, error in
                print("LIFESTAGES_STARTUP_PROBE: \(result as? String ?? String(describing: error))")
                fflush(stdout)
            }
        }
        }
    }
}
