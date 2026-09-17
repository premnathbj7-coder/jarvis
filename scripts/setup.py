"""
Optional packaging metadata for JARVIS, for anyone who wants to
`pip install -e .` the project instead of running it in-place.
Not required for normal use — start.bat / launcher.py is the
primary entry point.
"""
from setuptools import find_packages, setup

setup(
    name="jarvis-assistant",
    version="0.1.0",
    description="A local Windows desktop AI assistant (JARVIS)",
    packages=find_packages(exclude=("tests",)),
    python_requires=">=3.10",
    entry_points={
        "console_scripts": [
            "jarvis=launcher:main",
        ],
    },
)
