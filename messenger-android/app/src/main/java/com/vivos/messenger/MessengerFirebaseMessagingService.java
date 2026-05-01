package com.vivos.messenger;

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

public class MessengerFirebaseMessagingService extends FirebaseMessagingService {
    private static final String TAG = "VIVOS_MSG_FCM";
    private static final String CHANNEL_MESSAGES = "messages";
    private static final String CHANNEL_CALLS = "messenger_calls";

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);
        if (remoteMessage == null) return;

        Map<String, String> data = remoteMessage.getData();
        String type = safe(data.get("notificationType"));
        Log.d(TAG, "onMessageReceived type=" + type);

        if ("incoming_call".equals(type)) {
            showIncomingCallNotification(data);
            return;
        }

        showMessageNotification(remoteMessage, data);
    }

    private void showMessageNotification(RemoteMessage remoteMessage, Map<String, String> data) {
        createChannelsIfNeeded();
        String title = safeOrDefault(data.get("title"), remoteMessage.getNotification() != null ? remoteMessage.getNotification().getTitle() : "VIVOS Messenger");
        String body = safeOrDefault(data.get("body"), remoteMessage.getNotification() != null ? remoteMessage.getNotification().getBody() : "Ai un mesaj nou");
        String conversationId = safe(data.get("conversationId"));
        String url = "/messenger/" + conversationId;
        int notifId = buildNotifId("msg", conversationId + title);

        PendingIntent intent = PendingIntent.getBroadcast(this, notifId + 10,
                buildActionIntent(IncomingCallActionReceiver.ACTION_OPEN, notifId, url, null, null, conversationId, null, null),
                pendingIntentFlags());

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_MESSAGES)
                .setSmallIcon(getApplicationInfo().icon)
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true)
                .setContentIntent(intent);

        try {
            NotificationManagerCompat.from(this).notify(notifId, builder.build());
        } catch (SecurityException e) {
            Log.e(TAG, "showMessageNotification error", e);
        }
    }

    private void showIncomingCallNotification(Map<String, String> data) {
        createChannelsIfNeeded();
        String conversationId = safe(data.get("conversationId"));
        String callSessionId = safe(data.get("callSessionId"));
        String callerName = safe(data.get("callerName"));
        String answerUrl = "/messenger/" + conversationId;
        String declineUrl = "/messenger/" + conversationId;
        String title = safeOrDefault(data.get("title"), "Apel incoming");
        String body = safeOrDefault(data.get("body"), callerName.isEmpty() ? "Ai un apel în VIVOS Messenger" : callerName + " te apelează");
        int notifId = buildNotifId(callSessionId, conversationId);

        PendingIntent contentIntent = PendingIntent.getBroadcast(this, notifId + 1,
                buildActionIntent(IncomingCallActionReceiver.ACTION_OPEN, notifId, answerUrl, answerUrl, declineUrl, conversationId, callSessionId, callerName),
                pendingIntentFlags());
        PendingIntent answerIntent = PendingIntent.getBroadcast(this, notifId + 2,
                buildActionIntent(IncomingCallActionReceiver.ACTION_ANSWER, notifId, answerUrl, answerUrl, declineUrl, conversationId, callSessionId, callerName),
                pendingIntentFlags());
        PendingIntent declineIntent = PendingIntent.getBroadcast(this, notifId + 3,
                buildActionIntent(IncomingCallActionReceiver.ACTION_DECLINE, notifId, declineUrl, answerUrl, declineUrl, conversationId, callSessionId, callerName),
                pendingIntentFlags());

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_CALLS)
                .setSmallIcon(getApplicationInfo().icon)
                .setContentTitle(title)
                .setContentText(body)
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
            NotificationManagerCompat.from(this).notify(notifId, builder.build());
        } catch (SecurityException e) {
            Log.e(TAG, "showIncomingCallNotification error", e);
        }
    }

    private Intent buildActionIntent(String action, int notifId, String url, String answerUrl, String declineUrl, String conversationId, String callSessionId, String callerName) {
        Intent intent = new Intent(this, IncomingCallActionReceiver.class);
        intent.setAction(action);
        intent.putExtra(IncomingCallActionReceiver.EXTRA_NOTIFICATION_ID, notifId);
        intent.putExtra(IncomingCallActionReceiver.EXTRA_URL, url);
        intent.putExtra(IncomingCallActionReceiver.EXTRA_ANSWER_URL, answerUrl);
        intent.putExtra(IncomingCallActionReceiver.EXTRA_DECLINE_URL, declineUrl);
        intent.putExtra(IncomingCallActionReceiver.EXTRA_CONVERSATION_ID, conversationId);
        intent.putExtra(IncomingCallActionReceiver.EXTRA_CALL_SESSION_ID, callSessionId);
        intent.putExtra(IncomingCallActionReceiver.EXTRA_CALLER_NAME, callerName);
        return intent;
    }

    private void createChannelsIfNeeded() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null) return;

        NotificationChannel msgChannel = new NotificationChannel(CHANNEL_MESSAGES, "Mesaje", NotificationManager.IMPORTANCE_HIGH);
        msgChannel.setDescription("Notificări mesaje VIVOS Messenger");
        manager.createNotificationChannel(msgChannel);

        NotificationChannel callChannel = new NotificationChannel(CHANNEL_CALLS, "Apeluri", NotificationManager.IMPORTANCE_HIGH);
        callChannel.setDescription("Apeluri VIVOS Messenger");
        callChannel.enableVibration(true);
        callChannel.setLockscreenVisibility(android.app.Notification.VISIBILITY_PUBLIC);
        AudioAttributes audio = new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build();
        callChannel.setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE), audio);
        manager.createNotificationChannel(callChannel);
    }

    private int pendingIntentFlags() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M)
            return PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE;
        return PendingIntent.FLAG_UPDATE_CURRENT;
    }

    private int buildNotifId(String primary, String fallback) {
        String seed = (primary != null && !primary.isEmpty()) ? primary : fallback;
        if (seed == null || seed.isEmpty()) seed = String.valueOf(System.currentTimeMillis());
        return Math.abs(seed.hashCode());
    }

    private String safe(String v) { return v == null ? "" : v.trim(); }
    private String safeOrDefault(String v, String def) { String s = safe(v); return s.isEmpty() ? def : s; }
}
