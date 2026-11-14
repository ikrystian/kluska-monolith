package com.athlete.spa.widget;

import android.content.Context;
import android.util.Base64;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.util.Iterator;

/**
 * JS bridge feeding the pet home-screen widget (PetWidgetProvider) — see
 * src/lib/pet-widget.ts.
 *
 * The pet is drawn in the WebView, so its pictures arrive as base64 PNGs, one
 * per face, and are kept as files; `artKey` names the look they were drawn
 * for, so the app only redraws when the pet changes its looks.
 */
@CapacitorPlugin(name = "PetWidget")
public class PetWidgetPlugin extends Plugin {

    @PluginMethod
    public void publish(PluginCall call) {
        Context context = getContext();
        JSObject state = call.getObject("state");
        JSObject art = call.getObject("art");
        String artKey = call.getString("artKey");

        try {
            if (state == null) {
                clearArt(context);
                PetWidgetProvider.saveArtKey(context, null);
            } else if (art != null && artKey != null) {
                clearArt(context);
                writeArt(context, art);
                PetWidgetProvider.saveArtKey(context, artKey);
            }
        } catch (IOException | IllegalArgumentException e) {
            // Half-written pictures must not pass for the new look.
            PetWidgetProvider.saveArtKey(context, null);
            call.reject("Could not save the pet's pictures", e);
            return;
        }

        PetWidgetProvider.saveState(context, state == null ? null : state.toString());
        PetWidgetProvider.refresh(context);
        call.resolve();
    }

    @PluginMethod
    public void getArtKey(PluginCall call) {
        JSObject result = new JSObject();
        result.put("artKey", PetWidgetProvider.artKey(getContext()));
        call.resolve(result);
    }

    @PluginMethod
    public void takeStrokes(PluginCall call) {
        JSObject result = new JSObject();
        result.put("count", PetWidgetProvider.takeStrokes(getContext()));
        call.resolve(result);
    }

    private static void writeArt(Context context, JSObject art) throws IOException {
        File dir = PetWidgetProvider.artDir(context);
        if (!dir.isDirectory() && !dir.mkdirs()) throw new IOException("Cannot create " + dir);
        for (Iterator<String> faces = art.keys(); faces.hasNext(); ) {
            String face = faces.next();
            String png = art.getString(face);
            // The face becomes a file name.
            if (png == null || !face.matches("[a-z]+")) continue;
            try (FileOutputStream out = new FileOutputStream(new File(dir, face + ".png"))) {
                out.write(Base64.decode(png, Base64.DEFAULT));
            }
        }
    }

    private static void clearArt(Context context) {
        File[] files = PetWidgetProvider.artDir(context).listFiles();
        if (files == null) return;
        for (File file : files) file.delete();
    }
}
