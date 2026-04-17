package com.vivos.app;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final int VIVOS_AUDIO_PERMISSION_REQUEST = 1001;
    private boolean webChromeConfigured = false;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        ensureAudioPermission();
    }

    @Override
    protected void onResume() {
        super.onResume();
        ensureAudioPermission();
        configureWebChromeClient();
    }

    private void ensureAudioPermission() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO)
                != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(
                    this,
                    new String[]{ Manifest.permission.RECORD_AUDIO },
                    VIVOS_AUDIO_PERMISSION_REQUEST
            );
        }
    }

    private void configureWebChromeClient() {
        if (webChromeConfigured || getBridge() == null || getBridge().getWebView() == null) {
            return;
        }

        getBridge().getWebView().setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(() -> {
                    if (request == null) {
                        return;
                    }

                    boolean wantsAudio = false;
                    for (String resource : request.getResources()) {
                        if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource)) {
                            wantsAudio = true;
                            break;
                        }
                    }

                    if (!wantsAudio) {
                        request.deny();
                        return;
                    }

                    if (ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.RECORD_AUDIO)
                            == PackageManager.PERMISSION_GRANTED) {
                        request.grant(new String[]{ PermissionRequest.RESOURCE_AUDIO_CAPTURE });
                    } else {
                        ActivityCompat.requestPermissions(
                                MainActivity.this,
                                new String[]{ Manifest.permission.RECORD_AUDIO },
                                VIVOS_AUDIO_PERMISSION_REQUEST
                        );
                        request.deny();
                    }
                });
            }
        });

        webChromeConfigured = true;
    }
}
