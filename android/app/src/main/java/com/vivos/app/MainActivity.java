package com.vivos.app;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
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
    private static final String PENDING_PUSH_URL_KEY = "vivos:pending-push-url";

    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private String lastHandledNavigationUrl = null;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NativeCallPlugin.class);
        super.onCreate(savedInstanceState);
        Log.d(TAG, "onCreate");
        ensureAudioPermission();
        configureWebChromeClient();
        handleNotificationIntent(getIntent(), true);
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
        handleNotificationIntent(getIntent(), false);
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        Log.d(TAG, "onNewIntent");
        handleNotificationIntent(intent, true);
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

    private void handleNotificationIntent(Intent intent, boolean forceDispatch) {
        String targetUrl = extractNavigationUrl(intent);
        if (targetUrl == null || targetUrl.isEmpty()) {
            return;
        }

        if (!forceDispatch && targetUrl.equals(lastHandledNavigationUrl)) {
            return;
        }

        lastHandledNavigationUrl = targetUrl;
        dispatchPendingNavigation(targetUrl);
    }

    private String extractNavigationUrl(Intent intent) {
        if (intent == null || intent.getExtras() == null) {
            return null;
        }

        Bundle extras = intent.getExtras();
        String actionId = safeTrim(extras.getString("actionId"));
        String answerUrl = normalizeUrl(safeTrim(extras.getString("answerUrl")));
        String declineUrl = normalizeUrl(safeTrim(extras.getString("declineUrl")));
        String url = normalizeUrl(safeTrim(extras.getString("url")));
        String conversationId = safeTrim(extras.getString("conversationId"));

        if ("answer".equalsIgnoreCase(actionId) && answerUrl != null) {
            Log.d(TAG, "Notification intent resolved to answerUrl=" + answerUrl);
            return answerUrl;
        }

        if ("decline".equalsIgnoreCase(actionId) && declineUrl != null) {
            Log.d(TAG, "Notification intent resolved to declineUrl=" + declineUrl);
            return declineUrl;
        }

        if (url != null) {
            Log.d(TAG, "Notification intent resolved to url=" + url);
            return url;
        }

        if (conversationId != null && !conversationId.isEmpty()) {
            String fallbackUrl = "/messages/" + conversationId;
            Log.d(TAG, "Notification intent resolved to conversation fallback=" + fallbackUrl);
            return fallbackUrl;
        }

        return null;
    }

    private void dispatchPendingNavigation(String targetUrl) {
        if (getBridge() == null || getBridge().getWebView() == null) {
            Log.d(TAG, "dispatchPendingNavigation bridge/webView unavailable for url=" + targetUrl);
            return;
        }

        WebView webView = getBridge().getWebView();
        String escapedUrl = jsEscape(targetUrl);
        String script = "(function(){" +
                "try {" +
                "var url='" + escapedUrl + "';" +
                "window.localStorage.setItem('" + PENDING_PUSH_URL_KEY + "', url);" +
                "window.dispatchEvent(new CustomEvent('vivos:native-notification-url', { detail: { url: url } }));" +
                "} catch (e) { console.error('native notification handoff error', e); }" +
                "})();";

        mainHandler.postDelayed(() -> {
            try {
                webView.evaluateJavascript(script, null);
                Log.d(TAG, "dispatchPendingNavigation injected url=" + targetUrl);
            } catch (Exception error) {
                Log.e(TAG, "dispatchPendingNavigation evaluateJavascript error", error);
            }
        }, 250);
    }

    private String normalizeUrl(String value) {
        if (value == null || value.isEmpty()) return null;
        return value.startsWith("/") ? value : "/" + value;
    }

    private String safeTrim(String value) {
        return value == null ? null : value.trim();
    }

    private String jsEscape(String value) {
        return value
                .replace("\\", "\\\\")
                .replace("'", "\\'")
                .replace("\n", "\\n")
                .replace("\r", "\\r");
    }
}
