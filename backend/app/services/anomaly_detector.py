import numpy as np
import logging
from typing import Dict, Any, List, Tuple
from sklearn.ensemble import IsolationForest
from backend.app.core.config import settings

logger = logging.getLogger(__name__)

FEATURE_NAMES = ["temperature", "vibration", "pressure", "rpm", "current"]

class AnomalyDetector:
    """
    Industrial ML Anomaly Detection Engine using Scikit-Learn Isolation Forest.
    Trained on multivariate normal baseline equipment operational manifolds.
    Distinguishes ML multivariate anomaly detection from traditional rule-based threshold trips.
    """

    def __init__(self):
        self.models: Dict[str, IsolationForest] = {}
        self.feature_means: Dict[str, np.ndarray] = {}
        self.feature_stds: Dict[str, np.ndarray] = {}
        self.is_trained = False
        self._train_baseline_models()

    def _train_baseline_models(self):
        """Train individualized Isolation Forest models for each factory asset using synthetic normal baselines."""
        # Baseline configurations per machine [temp, vib, press, rpm, curr]
        baselines = {
            "M201": ([52.0, 2.1, 6.2, 3200.0, 18.5], [1.5, 0.25, 0.15, 25.0, 0.8]),
            "M202": ([48.0, 1.8, 160.0, 1200.0, 22.0], [1.2, 0.2, 4.0, 15.0, 1.1]),
            "M203": ([68.0, 2.8, 8.5, 2950.0, 32.0], [2.0, 0.35, 0.3, 30.0, 1.4]),
            "M204": ([58.0, 1.9, 3.2, 1480.0, 14.2], [1.4, 0.22, 0.1, 12.0, 0.6]),
            "M205": ([72.0, 2.4, 140.0, 1450.0, 28.4], [2.2, 0.3, 3.5, 18.0, 1.2]),
        }

        for m_id, (means, stds) in baselines.items():
            means_arr = np.array(means, dtype=np.float32)
            stds_arr = np.array(stds, dtype=np.float32)
            self.feature_means[m_id] = means_arr
            self.feature_stds[m_id] = stds_arr

            # Synthesize 400 normal operating samples with correlated multivariate noise
            n_samples = 400
            noise = np.random.normal(0, 1, size=(n_samples, len(FEATURE_NAMES)))
            X_train = means_arr + (noise * stds_arr)

            # Fit Isolation Forest model
            clf = IsolationForest(
                n_estimators=100,
                contamination=settings.ISOLATION_FOREST_CONTAMINATION,
                random_state=42
            )
            clf.fit(X_train)
            self.models[m_id] = clf

        self.is_trained = True
        logger.info(f"Isolation Forest models successfully trained for assets: {list(self.models.keys())}")

    def evaluate_reading(self, reading: Dict[str, Any]) -> Dict[str, Any]:
        """
        Evaluate real-time sensor reading using both:
        1. Isolation Forest Machine Learning model (multivariate distribution distance)
        2. Engineering physical threshold safety boundaries
        """
        m_id = reading.get("machine_id", "M201")
        if m_id not in self.models:
            # Fallback to general model if asset unknown
            m_id = "M201"

        clf = self.models[m_id]
        features = np.array([[
            reading["temperature"],
            reading["vibration"],
            reading["pressure"],
            reading["rpm"],
            reading["current"]
        ]], dtype=np.float32)

        # 1. Isolation Forest Prediction
        # pred is 1 for inlier (normal), -1 for outlier (anomaly)
        pred = clf.predict(features)[0]
        # decision_function returns negative values for outliers, positive for inliers
        raw_score = float(clf.decision_function(features)[0])
        # Convert decision function to a normalized anomaly score: 0 (normal) to 1.0 (extreme anomaly)
        # Typically raw_score is between -0.4 and +0.3
        anomaly_magnitude = max(0.0, min(1.0, round((-raw_score + 0.15) * 1.5, 3)))
        is_ml_anomaly = (pred == -1) or (anomaly_magnitude > 0.45)

        # 2. Parameter attribution: compute Z-score deviations to identify affected parameters
        means = self.feature_means[m_id]
        stds = self.feature_stds[m_id]
        z_scores = np.abs((features[0] - means) / stds)
        
        deviating_parameters = []
        for i, z in enumerate(z_scores):
            if z > 2.5:  # Over 2.5 standard deviations from baseline
                deviating_parameters.append({
                    "parameter": FEATURE_NAMES[i],
                    "observed_value": float(features[0][i]),
                    "baseline_mean": float(means[i]),
                    "z_score": round(float(z), 2)
                })

        # 3. Threshold Safety Rule Check (Independent Safety Interlock)
        limits = reading.get("nominal_limits", {})
        threshold_breaches = []
        if reading["temperature"] > limits.get("temp_max", 90.0):
            threshold_breaches.append(f"Temperature ({reading['temperature']}°C) exceeded upper safety limit ({limits['temp_max']}°C)")
        if reading["vibration"] > limits.get("vib_max", 5.0):
            threshold_breaches.append(f"Vibration ({reading['vibration']} mm/s) exceeded ISO vibration boundary ({limits['vib_max']} mm/s)")
        if reading["pressure"] < limits.get("press_min", 1.0):
            threshold_breaches.append(f"Pressure ({reading['pressure']} bar) fell below minimum operating hydraulic head ({limits['press_min']} bar)")

        is_threshold_alert = len(threshold_breaches) > 0

        # Composite anomaly decision
        overall_anomaly = is_ml_anomaly or is_threshold_alert
        detection_source = "HYBRID_ML_AND_SAFETY_RULE" if (is_ml_anomaly and is_threshold_alert) else (
            "ML_ISOLATION_FOREST" if is_ml_anomaly else ("SAFETY_THRESHOLD_BREACH" if is_threshold_alert else "NORMAL")
        )

        return {
            "machine_id": m_id,
            "timestamp": reading.get("timestamp"),
            "is_anomaly": overall_anomaly,
            "anomaly_score": anomaly_magnitude,
            "detection_source": detection_source,
            "deviating_parameters": deviating_parameters,
            "threshold_breaches": threshold_breaches,
            "model_algorithm": "Scikit-Learn IsolationForest (100 estimators, 5% contamination)",
            "reading_snapshot": reading
        }

anomaly_detector = AnomalyDetector()
