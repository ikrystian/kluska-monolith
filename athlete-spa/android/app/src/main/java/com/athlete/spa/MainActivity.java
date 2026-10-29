package com.athlete.spa;

import android.os.Bundle;

import com.athlete.spa.cueaudio.CueAudioPlugin;
import com.athlete.spa.runtracking.RunTrackingPlugin;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(CueAudioPlugin.class);
        registerPlugin(RunTrackingPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
