package com.vivos.app;

import android.app.NotificationManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

public class IncomingCallActionReceiver extends BroadcastReceiver {
    public static final String ACTION_OPEN = "com.vivos.app.action.OPEN_CALL";
    public static final String ACTION_ANSWER = "com.vivos.app.action.ANSWER_CALL";
    public static final String ACTION_DECLINE = "com.vivos.app.action.DECLINE_CALL";

    public static final String EXTRA_URL = "url";
    public static final String EXTRA_ANSWER_URL = "answerUrl";
    public static final String EXTRA_DECLINE_URL = "declineUrl";
    public static final String EXTRA_CONVERSATION_ID = "conversationId";
    public static final String EXTRA_CALL_SESSION_ID = "callSessionId";
    public static final String EXTRA_CALLER_NAME = "callerName";
    public static final String EXTRA_NOTIFICATION_ID = "notificationId";
    public static final String EXTRA_ACTION_ID = "actionId";

    private static final String TAG = "VIVOS_CALL_ACTION";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null) return;

        String action = intent.getAction();
        Log.d(TAG, "onReceive action=" + action);

        dismissNotification(context, intent.getIntExtra(EXTRA_NOTIFICATION_ID, 0));

        Intent launchIntent = new Intent(context, MainActivity.class);
        launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);

        launchIntent.putExtra(EXTRA_URL, intent.getStringExtra(EXTRA_URL));
        launchIntent.putExtra(EXTRA_ANSWER_URL, intent.getStringExtra(EXTRA_ANSWER_URL));
        launchIntent.putExtra(EXTRA_DECLINE_URL, intent.getStringExtra(EXTRA_DECLINE_URL));
        launchIntent.putExtra(EXTRA_CONVERSATION_ID, intent.getStringExtra(EXTRA_CONVERSATION_ID));
        launchIntent.putExtra(EXTRA_CALL_SESSION_ID, intent.getStringExtra(EXTRA_CALL_SESSION_ID));
        launchIntent.putExtra(EXTRA_CALLER_NAME, intent.getStringExtra(EXTRA_CALLER_NAME));

        if (ACTION_ANSWER.equals(action)) {
            launchIntent.putExtra(EXTRA_ACTION_ID, "answer");
        } else if (ACTION_DECLINE.equals(action)) {
            launchIntent.putExtra(EXTRA_ACTION_ID, "decline");
        } else {
            launchIntent.putExtra(EXTRA_ACTION_ID, "open");
        }

        context.startActivity(launchIntent);
    }

    private void dismissNotification(Context context, int notificationId) {
        if (notificationId == 0) return;
        try {
            NotificationManager notificationManager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (notificationManager != null) {
                notificationManager.cancel(notificationId);
            }
        } catch (Exception error) {
            Log.e(TAG, "dismissNotification error", error);
        }
    }
}
