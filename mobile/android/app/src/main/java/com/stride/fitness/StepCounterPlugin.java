package com.stride.fitness;

import android.content.Context;
import android.content.SharedPreferences;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

@CapacitorPlugin(name = "StepCounter")
public class StepCounterPlugin extends Plugin implements SensorEventListener {

    private SensorManager sensorManager;
    private Sensor stepSensor;
    private static final String PREF_NAME = "stride_step_prefs";
    private static final String KEY_DATE = "last_step_date";
    private static final String KEY_BASELINE = "baseline_steps";
    private static final String KEY_TODAY_STEPS = "today_steps";
    private int latestRawSteps = -1;

    @Override
    public void load() {
        super.load();
        try {
            sensorManager = (SensorManager) getContext().getSystemService(Context.SENSOR_SERVICE);
            if (sensorManager != null) {
                stepSensor = sensorManager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER);
                if (stepSensor != null) {
                    sensorManager.registerListener(this, stepSensor, SensorManager.SENSOR_DELAY_NORMAL);
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @Override
    public void onSensorChanged(SensorEvent event) {
        if (event.sensor.getType() == Sensor.TYPE_STEP_COUNTER) {
            int rawSteps = (int) event.values[0];
            latestRawSteps = rawSteps;
            updateStepsWithRaw(rawSteps);
        }
    }

    @Override
    public void onAccuracyChanged(Sensor sensor, int accuracy) {}

    private synchronized int updateStepsWithRaw(int rawSteps) {
        try {
            SharedPreferences prefs = getContext().getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
            String todayStr = new SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(new Date());
            String savedDate = prefs.getString(KEY_DATE, "");
            int baseline = prefs.getInt(KEY_BASELINE, -1);

            // New day or first run or device reboot where rawSteps wrapped: reset baseline
            if (!todayStr.equals(savedDate) || baseline < 0 || rawSteps < baseline) {
                baseline = rawSteps;
                prefs.edit()
                    .putString(KEY_DATE, todayStr)
                    .putInt(KEY_BASELINE, baseline)
                    .putInt(KEY_TODAY_STEPS, 0)
                    .apply();
                return 0;
            }

            int todaySteps = Math.max(0, rawSteps - baseline);
            prefs.edit().putInt(KEY_TODAY_STEPS, todaySteps).apply();
            return todaySteps;
        } catch (Exception e) {
            return 0;
        }
    }

    @PluginMethod
    public void getTodaySteps(PluginCall call) {
        try {
            SharedPreferences prefs = getContext().getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
            String todayStr = new SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(new Date());
            String savedDate = prefs.getString(KEY_DATE, "");
            int todaySteps = prefs.getInt(KEY_TODAY_STEPS, 0);

            if (!todayStr.equals(savedDate)) {
                todaySteps = 0;
            }

            if (latestRawSteps > 0) {
                todaySteps = updateStepsWithRaw(latestRawSteps);
            }

            JSObject ret = new JSObject();
            ret.put("steps", todaySteps);
            ret.put("hasSensor", stepSensor != null);
            ret.put("distanceKm", Math.round(todaySteps * 0.00076 * 100.0) / 100.0);
            ret.put("calories", Math.round(todaySteps * 0.04));
            ret.put("date", todayStr);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to read steps: " + e.getMessage());
        }
    }

    @PluginMethod
    public void checkSensor(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("hasSensor", stepSensor != null);
        call.resolve(ret);
    }
}
