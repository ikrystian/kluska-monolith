package com.athlete.spa.instagram;

import android.content.ActivityNotFoundException;
import android.content.ClipData;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.util.Base64;

import androidx.core.content.FileProvider;

import com.athlete.spa.R;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;

/**
 * JS bridge for sharing an image to Instagram as a Story or a feed post —
 * see src/lib/instagram-share.ts.
 *
 * The image arrives as base64 PNG, is written to the cache directory and
 * handed over as a content:// URI through the app's FileProvider (the
 * cache-path in res/xml/file_paths.xml covers it). Instagram needs a one-off
 * read grant for that URI.
 */
@CapacitorPlugin(name = "InstagramShare")
public class InstagramSharePlugin extends Plugin {

    private static final String INSTAGRAM_PACKAGE = "com.instagram.android";
    private static final String STORY_ACTION = "com.instagram.share.ADD_TO_STORY";
    private static final String SHARE_DIR = "instagram-share";
    private static final String MIME_PNG = "image/png";

    @PluginMethod
    public void isInstalled(PluginCall call) {
        JSObject result = new JSObject();
        result.put("installed", isInstagramInstalled());
        call.resolve(result);
    }

    @PluginMethod
    public void shareToStory(PluginCall call) {
        share(call, true);
    }

    @PluginMethod
    public void shareToPost(PluginCall call) {
        share(call, false);
    }

    private void share(PluginCall call, boolean story) {
        String image = call.getString("image");
        if (image == null || image.isEmpty()) {
            call.reject("image is required");
            return;
        }
        if (!isInstagramInstalled()) {
            call.reject("Instagram is not installed", "NOT_INSTALLED");
            return;
        }

        Uri uri;
        try {
            uri = writeImage(image);
        } catch (IOException | IllegalArgumentException e) {
            call.reject("Could not prepare the image", e);
            return;
        }

        Context context = getContext();
        Intent intent = story ? storyIntent(context, uri) : postIntent(uri);
        context.grantUriPermission(INSTAGRAM_PACKAGE, uri, Intent.FLAG_GRANT_READ_URI_PERMISSION);

        try {
            getActivity().startActivity(intent);
            call.resolve();
        } catch (ActivityNotFoundException e) {
            call.reject("Instagram cannot handle this share", "NOT_SUPPORTED", e);
        }
    }

    /**
     * Story composer with the image as its background. Instagram asks for the
     * sharing app's Facebook App ID as `source_application`; it comes from the
     * instagram_source_application string and is left out while that is empty.
     */
    private Intent storyIntent(Context context, Uri uri) {
        Intent intent = new Intent(STORY_ACTION);
        intent.setDataAndType(uri, MIME_PNG);
        intent.setPackage(INSTAGRAM_PACKAGE);
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

        String sourceApplication = context.getString(R.string.instagram_source_application);
        if (!sourceApplication.isEmpty()) {
            intent.putExtra("source_application", sourceApplication);
        }
        return intent;
    }

    /** Hands the image to Instagram's share target, which opens the new-post flow. */
    private Intent postIntent(Uri uri) {
        Intent intent = new Intent(Intent.ACTION_SEND);
        intent.setType(MIME_PNG);
        intent.setPackage(INSTAGRAM_PACKAGE);
        intent.putExtra(Intent.EXTRA_STREAM, uri);
        intent.setClipData(ClipData.newRawUri("", uri));
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        return intent;
    }

    private boolean isInstagramInstalled() {
        try {
            getContext().getPackageManager().getPackageInfo(INSTAGRAM_PACKAGE, 0);
            return true;
        } catch (PackageManager.NameNotFoundException e) {
            return false;
        }
    }

    /** Writes the PNG into the cache (dropping earlier shares) and returns its FileProvider URI. */
    private Uri writeImage(String base64) throws IOException {
        byte[] bytes = Base64.decode(base64, Base64.DEFAULT);

        File dir = new File(getContext().getCacheDir(), SHARE_DIR);
        if (!dir.exists() && !dir.mkdirs()) {
            throw new IOException("Could not create " + dir);
        }
        File[] previous = dir.listFiles();
        if (previous != null) {
            for (File file : previous) {
                //noinspection ResultOfMethodCallIgnored
                file.delete();
            }
        }

        File file = new File(dir, "share-" + System.currentTimeMillis() + ".png");
        try (FileOutputStream out = new FileOutputStream(file)) {
            out.write(bytes);
        }

        return FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", file);
    }
}
