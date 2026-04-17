package com.vivos.app;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.util.Log;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebView;

import androidx.annotation.NonNull;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.BridgeActivity;
import com.vivos.app.nativecall.NativeCallPlugin;

import java.util.Arrays;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "VIVOS_AUDIO";
    private static final int VIVOS_AUDIO_PERMISSION_REQUEST = 1001;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NativeCallPlugin.class);
        super.onCreate(savedInstanceState);
        Log.d(TAG, "onCreate");
        ensureAudioPermission();
        configureWebChromeClient();
    }

    @Override
    public void onStart() {
        super.onStart();
        Log.d(TAG, "onStart");
        configureWebChromeClient();
    }

    @Override
    public void onResume() {
        super.onResume();
        Log.d(TAG, "onResume");
        ensureAudioPermission();
        configureWebChromeClient();
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);

        if (requestCode == VIVOS_AUDIO_PERMISSION_REQUEST) {
            boolean granted = grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED;
            Log.d(TAG, "onRequestPermissionsResult granted=" + granted);
            configureWebChromeClient();
        }
    }

    private void ensureAudioPermission() {
        int state = ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO);
        Log.d(TAG, "ensureAudioPermission state=" + state);

        if (state != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(
                    this,
                    new String[]{Manifest.permission.RECORD_AUDIO},
                    VIVOS_AUDIO_PERMISSION_REQUEST
            );
        }
    }

    private void configureWebChromeClient() {
        if (getBridge() == null) {
            Log.d(TAG, "configureWebChromeClient bridge=null");
            return;
        }

        WebView webView = getBridge().getWebView();
        if (webView == null) {
            Log.d(TAG, "configureWebChromeClient webView=null");
            return;
        }

        webView.post(() -> {
            Log.d(TAG, "Applying WebChromeClient to bridge WebView");

            webView.setWebChromeClient(new WebChromeClient() {
                @Override
                public void onPermissionRequest(final PermissionRequest request) {
                    runOnUiThread(() -> {
                        if (request == null) {
                            Log.d(TAG, "onPermissionRequest request=null");
                            return;
                        }

                        String[] resources = request.getResources();
                        Log.d(TAG, "onPermissionRequest resources=" + Arrays.toString(resources));

                        boolean wantsAudio = false;
                        for (String resource : resources) {
                            if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource)) {
                                wantsAudio = true;
                                break;
                            }
                        }

                        if (!wantsAudio) {
                            Log.d(TAG, "onPermissionRequest deny: no audio resource requested");
                            request.deny();
                            return;
                        }

                        int state = ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.RECORD_AUDIO);
                        Log.d(TAG, "onPermissionRequest audio permission state=" + state);

                        if (state == PackageManager.PERMISSION_GRANTED) {
                            Log.d(TAG, "onPermissionRequest grant audio capture");
                            request.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
                        } else {
                            Log.d(TAG, "onPermissionRequest request Android audio permission first");
                            ActivityCompat.requestPermissions(
                                    MainActivity.this,
                                    new String[]{Manifest.permission.RECORD_AUDIO},
                                    VIVOS_AUDIO_PERMISSION_REQUEST
                            );
                            request.deny();
                        }
                    });
                }

                @Override
                public void onPermissionRequestCanceled(PermissionRequest request) {
                    Log.d(TAG, "onPermissionRequestCanceled");
                    super.onPermissionRequestCanceled(request);
                }
            });
        });
    }
}
