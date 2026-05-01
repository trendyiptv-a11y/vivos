package com.vivos.messenger.nativecall;

import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "NativeCall")
public class NativeCallPlugin extends Plugin {

    private static final String TAG = "VIVOS_MSG_NATIVE_CALL";

    @PluginMethod
    public void notifyCallState(PluginCall call) {
        Log.d(TAG, "notifyCallState state=" + call.getString("state", ""));
        call.resolve();
    }

    @PluginMethod
    public void requestAudioFocus(PluginCall call) {
        JSObject result = new JSObject();
        result.put("granted", true);
        call.resolve(result);
    }

    @PluginMethod
    public void abandonAudioFocus(PluginCall call) {
        call.resolve();
    }
}
