import matplotlib.pyplot as plt
import numpy as np
from suitability_score import suitability

temps = np.linspace(0, 28, 200)
scores = [suitability(t) for t in temps]

fig, ax = plt.subplots(figsize=(8, 4))
ax.plot(temps, scores, linewidth=2)
ax.axvspan(12, 18, alpha=0.15, label="Optimal (12–18°C)")
ax.axvline(20, color="red", linestyle="--", alpha=0.5, label="Stress threshold (20°C)")
ax.set_xlabel("Temperature (°C)")
ax.set_ylabel("Habitat suitability")
ax.set_title("American lobster thermal suitability curve")
ax.legend()
ax.grid(alpha=0.3)
plt.tight_layout()
plt.savefig("suitability_curve.png", dpi=150)
plt.show()
