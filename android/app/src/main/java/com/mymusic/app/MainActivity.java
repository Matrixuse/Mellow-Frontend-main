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
}
