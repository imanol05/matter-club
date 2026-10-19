package com.matterclub.panel;

import android.os.Bundle;
import android.view.WindowManager;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // El tablero y el torneo se usan todo el partido sin tocar la pantalla
        // por ratos: que no se apague ni se bloquee en el medio.
        if (BuildConfig.SIN_APAGAR) {
            getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        }
    }
}
