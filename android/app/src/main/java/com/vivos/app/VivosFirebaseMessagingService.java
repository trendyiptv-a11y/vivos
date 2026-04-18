package com.vivos.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.util.Log;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

import java.util.Map;

public class VivosFirebaseMessagingService extends FirebaseMessagingService {
    private static final String TAG = "VIVOS_FCM_CALL";
    private static final String CHANNEL_GENERAL = "default";
    private static final String CHANNEL_CALLS = "incoming_calls";

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);

        if (remoteMessage == null) return;

        Map<String, String> data = remoteMessage.getData();
        String notificationType = safe(data.get("notificationType"));

        Log.d(TAG, "onMessageReceived type=" + notificationType + " data=" + data);

        if ("incoming_call".equals(notificationType)) {
            showIncomingCallNotification(data);
            return;
        }

        showGeneralNotification(remoteMessage, data);
    }

    private void showIncomingCallNotification(Map<String, String> data) {
        createChannelsIfNeeded();

        String conversationId = safe(data.get("conversationId"));
        String callSessionId = safe(data.get("callSessionId"));
        String callerName = safe(data.get("callerName"));
        String url = normalizeUrl(data.get("url"));
        String answerUrl = normalizeUrl(data.get("answerUrl"));
        String declineUrl = normalizeUrl(data.get("declineUrl"));
        String title = safeOrDefault(data.get("title"), "Apel incoming");
        String body = safeOrDefault(data.get("body"), (callerName.isEmpty() ? "Ai un apel incoming în VIVOS" : callerName + " te apelează"));

        int notificationId = buildNotificationId(callSessionId, conversationId);

        PendingIntent contentIntent = PendingIntent.getBroadcast(
                this,
                notificationId + 1,
                buildActionIntent(IncomingCallActionReceiver.ACTION_OPEN, notificationId, url, answerUrl, declineUrl, conversationId, callSessionId, callerName),
                pendingIntentFlags()
        );

        PendingIntent answerIntent = PendingIntent.getBroadcast(
                this,
                notificationId + 2,
                buildActionIntent(IncomingCallActionReceiver.ACTION_ANSWER, notificationId, url, answerUrl, declineUrl, conversationId, callSessionId, callerName),
                pendingIntentFlags()
        );

        PendingIntent declineIntent = PendingIntent.getBroadcast(
                this,
                notificationId + 3,
                buildActionIntent(IncomingCallActionReceiver.ACTION_DECLINE, notificationId, url, answerUrl, declineUrl, conversationId, callSessionId, callerName),
                pendingIntentFlags()
        );

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_CALLS)
                .setSmallIcon(getApplicationInfo().icon)
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_CALL)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setOngoing(true)
                .setAutoCancel(true)
                .setContentIntent(contentIntent)
                .setFullScreenIntent(contentIntent, true)
                .addAction(0, "Răspunde", answerIntent)
                .addAction(0, "Respinge", declineIntent);

        try {
            NotificationManagerCompat.from(this).notify(notificationId, builder.build());
            Log.d(TAG, "Incoming call notification displayed id=" + notificationId);
        } catch (SecurityException error) {
            Log.e(TAG, "showIncomingCallNotification security error", error);
        }
    }

    private void showGeneralNotification(RemoteMessage remoteMessage, Map<String, String> data) {
        String title = safeOrDefault(data.get("title"), remoteMessage.getNotification() != null ? remoteMessage.getNotification().getTitle() : "VIVOS");
        String body = safeOrDefault(data.get("body"), remoteMessage.getNotification() != null ? remoteMessage.getNotification().getBody() : "Ai o notificare nouă");
        String conversationId = safe(data.get("conversationId"));
        String url = normalizeUrl(data.get("url"));
        int notificationId = buildNotificationId("general", conversationId + title + body);

        createChannelsIfNeeded();

        PendingIntent contentIntent = PendingIntent.getBroadcast(
                this,
                notificationId + 10,
                buildActionIntent(IncomingCallActionReceiver.ACTION_OPEN, notificationId, url, null, null, conversationId, null, null),
                pendingIntentFlags()
        );

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_GENERAL)
                .setSmallIcon(getApplicationInfo().icon)
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true)
                .setContentIntent(contentIntent);

        try {
            NotificationManagerCompat.from(this).notify(notificationId, builder.build());
        } catch (SecurityException error) {
            Log.e(TAG, "showGeneralNotification security error", error);
        }
    }

    private Intent buildActionIntent(String action, int notificationId, String url, String answerUrl, String declineUrl, String conversationId, String callSessionId, String callerName) {
        Intent intent = new Intent(this, IncomingCallActionReceiver.class);
        intent.setAction(action);
        intent.putExtra(IncomingCallActionReceiver.EXTRA_NOTIFICATION_ID, notificationId);
        intent.putExtra(IncomingCallActionReceiver.EXTRA_URL, url);
        intent.putExtra(IncomingCallActionReceiver.EXTRA_ANSWER_URL, answerUrl);
        intent.putExtra(IncomingCallActionReceiver.EXTRA_DECLINE_URL, declineUrl);
        intent.putExtra(IncomingCallActionReceiver.EXTRA_CONVERSATION_ID, conversationId);
        intent.putExtra(IncomingCallActionReceiver.EXTRA_CALL_SESSION_ID, callSessionId);
        intent.putExtra(IncomingCallActionReceiver.EXTRA_CALLER_NAME, callerName);
        return intent;
    }

    private void createChannelsIfNeeded() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return;
        }

        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null) return;

        NotificationChannel generalChannel = new NotificationChannel(
                CHANNEL_GENERAL,
                "General",
                NotificationManager.IMPORTANCE_HIGH
        );
        generalChannel.setDescription("Notificări generale VIVOS");
        manager.createNotificationChannel(generalChannel);

        NotificationChannel callChannel = new NotificationChannel(
                CHANNEL_CALLS,
                "Apeluri",
                NotificationManager.IMPORTANCE_HIGH
        );
        callChannel.setDescription("Notificări pentru apeluri incoming");
        callChannel.enableVibration(true);
        callChannel.setLockscreenVisibility(android.app.Notification.VISIBILITY_PUBLIC);

        AudioAttributes audioAttributes = new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build();
        Uri ringtoneUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
        callChannel.setSound(ringtoneUri, audioAttributes);

        manager.createNotificationChannel(callChannel);
    }

    private int pendingIntentFlags() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            return PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE;
        }
        return PendingIntent.FLAG_UPDATE_CURRENT;
    }

    private int buildNotificationId(String primary, String fallback) {
        String seed = (primary != null && !primary.isEmpty()) ? primary : fallback;
        if (seed == null || seed.isEmpty()) {
            seed = String.valueOf(System.currentTimeMillis());
        }
        return Math.abs(seed.hashCode());
    }

    private String normalizeUrl(String value) {
        String safe = safe(value);
        if (safe.isEmpty()) return null;
        return safe.startsWith("/") ? safe : "/" + safe;
    }

    private String safe(String value) {
        return value == null ? "" : value.trim();
    }

    private String safeOrDefault(String value, String fallback) {
        String safe = safe(value);
        return safe.isEmpty() ? fallback : safe;
    }
}
