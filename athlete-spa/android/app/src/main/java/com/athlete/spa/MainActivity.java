package com.athlete.spa;

import android.os.Bundle;

import com.athlete.spa.cueaudio.CueAudioPlugin;
import com.athlete.spa.instagram.InstagramSharePlugin;
import com.athlete.spa.runtracking.RunTrackingPlugin;
import com.athlete.spa.widget.PetWidgetPlugin;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(CueAudioPlugin.class);
        registerPlugin(RunTrackingPlugin.class);
        registerPlugin(InstagramSharePlugin.class);
        registerPlugin(PetWidgetPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
