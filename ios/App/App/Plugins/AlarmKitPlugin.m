#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

CAP_PLUGIN(AlarmKitPlugin, "AlarmKitPlugin",
    CAP_PLUGIN_METHOD(requestAuthorization, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(scheduleAlarm, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(cancelAlarm, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(pauseAlarm, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(resumeAlarm, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(getAlarms, CAPPluginReturnPromise);
)