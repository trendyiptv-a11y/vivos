package com.vivos.app.nativecall;

import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "NativeCall")
public class NativeCallPlugin extends Plugin {

    private static final String TAG = "VIVOS_NATIVE_CALL";

    @PluginMethod
    public void notifyCallState(PluginCall call) {
        String state = call.getString("state", "");
        String conversationId = call.getString("conversationId", "");
        Log.d(TAG, "notifyCallState state=" + state + " conversationId=" + conversationId);
        call.resolve();
    }

    @PluginMethod
    public void requestAudioFocus(PluginCall call) {
        Log.d(TAG, "requestAudioFocus");
        JSObject result = new JSObject();
        result.put("granted", true);
        call.resolve(result);
    }

    @PluginMethod
    public void abandonAudioFocus(PluginCall call) {
        Log.d(TAG, "abandonAudioFocus");
        call.resolve();
    }
}
