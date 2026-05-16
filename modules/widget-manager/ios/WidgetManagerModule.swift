import ExpoModulesCore

public class WidgetManagerModule: Module {
  // Each module class must implement the definition function. The definition consists of components
  // that describes the module's functionality and behavior.
  // See https://docs.expo.dev/modules/module-api for more details about available components.
  public func definition() -> ModuleDefinition {
    Name("WidgetManager")

    Function("setWidgetData") { (data: String) in
      // Utilisation d'un App Group pour partager avec le widget (ex: group.com.tabitha.nihon)
      if let userDefaults = UserDefaults(suiteName: "group.com.tabitha.nihon") {
        userDefaults.set(data, forKey: "widget_data")
        // Optionnel : Notifier le widget iOS de se mettre à jour via WidgetCenter
        // if #available(iOS 14.0, *) {
        //   import WidgetKit
        //   WidgetCenter.shared.reloadAllTimelines()
        // }
      }
    }
  }
}

