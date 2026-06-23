package com.mymusic.app;

import android.os.Bundle;
import android.util.Log;
import com.getcapacitor.BridgeActivity;
import com.mymusic.app.NativeMediaPlugin;

import java.util.List;

public class MainActivity extends BridgeActivity {
	private static final String TAG = "MainActivity";

	@Override
	public void onCreate(Bundle savedInstanceState) {
		// Manually register the NativeMedia plugin BEFORE bridge initialization
		registerPlugin(NativeMediaPlugin.class);
		super.onCreate(savedInstanceState);
	}

	@Override
	protected void onSaveInstanceState(Bundle outState) {
		// Save the state before activity is destroyed
		super.onSaveInstanceState(outState);
		Log.d(TAG, "onSaveInstanceState called - saving app state");
	}

	@Override
	protected void onRestoreInstanceState(Bundle savedInstanceState) {
		// Restore the saved state
		super.onRestoreInstanceState(savedInstanceState);
		Log.d(TAG, "onRestoreInstanceState called - restoring app state");
	}

	@Override
	protected void onPause() {
		super.onPause();
		Log.d(TAG, "onPause called - app paused but not destroyed");
	}

	@Override
	protected void onResume() {
		super.onResume();
		Log.d(TAG, "onResume called - app resumed from background");
	}
}
