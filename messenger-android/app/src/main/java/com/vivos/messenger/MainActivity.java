package com.vivos.messenger;

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
import com.vivos.messenger.nativecall.NativeCallPlugin;

import java.util.Arrays;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "VIVOS_MESSENGER";
    private static final int PERMISSION_REQUEST = 1001;
    private static final String PENDING_PUSH_URL_KEY = "vivos:pending-push-url";

    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private String lastHandledNavigationUrl = null;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NativeCallPlugin.class);
        super.onCreate(savedInstanceState);
        ensurePermissions();
        configureWebChromeClient();
        handleNotificationIntent(getIntent(), true);
    }

    @Override
    public void onStart() {
        super.onStart();
        configureWebChromeClient();
    }

    @Override
    public void onResume() {
        super.onResume();
        ensurePermissions();
        configureWebChromeClient();
        handleNotificationIntent(getIntent(), false);
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleNotificationIntent(intent, true);
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == PERMISSION_REQUEST) {
            configureWebChromeClient();
        }
    }

    private void ensurePermissions() {
        String[] needed = new String[]{Manifest.permission.RECORD_AUDIO, Manifest.permission.CAMERA};
        boolean allGranted = true;
        for (String perm : needed) {
            if (ContextCompat.checkSelfPermission(this, perm) != PackageManager.PERMISSION_GRANTED) {
                allGranted = false;
                break;
            }
        }
        if (!allGranted) {
            ActivityCompat.requestPermissions(this, needed, PERMISSION_REQUEST);
        }
    }

    private void configureWebChromeClient() {
        if (getBridge() == null) return;
        WebView webView = getBridge().getWebView();
        if (webView == null) return;

        webView.post(() -> webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(() -> {
                    if (request == null) return;
                    String[] resources = request.getResources();
                    Log.d(TAG, "onPermissionRequest resources=" + Arrays.toString(resources));

                    boolean wantsAudio = false;
                    boolean wantsVideo = false;
                    for (String r : resources) {
                        if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(r)) wantsAudio = true;
                        if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(r)) wantsVideo = true;
                    }

                    boolean audioGranted = ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED;
                    boolean cameraGranted = ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED;

                    java.util.List<String> toGrant = new java.util.ArrayList<>();
                    if (wantsAudio && audioGranted) toGrant.add(PermissionRequest.RESOURCE_AUDIO_CAPTURE);
                    if (wantsVideo && cameraGranted) toGrant.add(PermissionRequest.RESOURCE_VIDEO_CAPTURE);

                    if (!toGrant.isEmpty()) {
                        request.grant(toGrant.toArray(new String[0]));
                    } else {
                        ActivityCompat.requestPermissions(MainActivity.this, new String[]{Manifest.permission.RECORD_AUDIO, Manifest.permission.CAMERA}, PERMISSION_REQUEST);
                        request.deny();
                    }
                });
            }
        }));
    }

    private void handleNotificationIntent(Intent intent, boolean forceDispatch) {
        String targetUrl = extractNavigationUrl(intent);
        if (targetUrl == null || targetUrl.isEmpty()) return;
        if (!forceDispatch && targetUrl.equals(lastHandledNavigationUrl)) return;
        lastHandledNavigationUrl = targetUrl;
        dispatchPendingNavigation(targetUrl);
    }

    private String extractNavigationUrl(Intent intent) {
        if (intent == null || intent.getExtras() == null) return null;
        Bundle extras = intent.getExtras();
        String actionId = safeTrim(extras.getString("actionId"));
        String answerUrl = normalizeUrl(safeTrim(extras.getString("answerUrl")));
        String declineUrl = normalizeUrl(safeTrim(extras.getString("declineUrl")));
        String url = normalizeUrl(safeTrim(extras.getString("url")));
        String conversationId = safeTrim(extras.getString("conversationId"));

        if ("answer".equalsIgnoreCase(actionId) && answerUrl != null) return answerUrl;
        if ("decline".equalsIgnoreCase(actionId) && declineUrl != null) return declineUrl;
        if (url != null) return url;
        if (conversationId != null && !conversationId.isEmpty()) return "/messenger/" + conversationId;
        return null;
    }

    private void dispatchPendingNavigation(String targetUrl) {
        if (getBridge() == null || getBridge().getWebView() == null) return;
        WebView webView = getBridge().getWebView();
        String escapedUrl = jsEscape(targetUrl);
        String script = "(function(){" +
                "try{" +
                "var url='" + escapedUrl + "';" +
                "window.localStorage.setItem('" + PENDING_PUSH_URL_KEY + "',url);" +
                "window.dispatchEvent(new CustomEvent('vivos:native-notification-url',{detail:{url:url}}));" +
                "}catch(e){console.error('notification handoff error',e);}" +
                "})();";
        mainHandler.postDelayed(() -> {
            try {
                webView.evaluateJavascript(script, null);
            } catch (Exception e) {
                Log.e(TAG, "dispatchPendingNavigation error", e);
            }
        }, 250);
    }

    private String normalizeUrl(String value) {
        if (value == null || value.isEmpty()) return null;
        if (value.startsWith("/messenger")) return value;
        return value.startsWith("/") ? "/messenger" + value : "/messenger/" + value;
    }

    private String safeTrim(String value) { return value == null ? null : value.trim(); }

    private String jsEscape(String value) {
        return value.replace("\\", "\\\\").replace("'", "\\'").replace("\n", "\\n").replace("\r", "\\r");
    }
}
