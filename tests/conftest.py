"""Test bootstrap that loads pure domain modules without Home Assistant."""

from __future__ import annotations

import sys
from pathlib import Path
from types import ModuleType

PACKAGE = "custom_components.smart_yardian"
package = ModuleType(PACKAGE)
package.__path__ = [str(Path(__file__).parents[1] / "custom_components" / "smart_yardian")]
sys.modules.setdefault(PACKAGE, package)
