"""Application constants and configuration."""

from dataclasses import dataclass

@dataclass(frozen=True)
class ExportFormat:
    extension: str
    media_type: str
    marp_flag: str
    display_name: str

EXPORT_FORMATS = {
    "pdf": ExportFormat("pdf", "application/pdf", "--pdf", "PDF"),
    "html": ExportFormat("html", "text/html", "--html", "HTML"),
    "pptx": ExportFormat("pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation", "--pptx", "PPTX")
}

BUILTIN_THEMES = {
    "default": "Clean and minimal design with professional typography",
    "corporate": "Professional business style with blue accent colors",
    "academic": "Academic style optimized for technical presentations"
}

def get_export_format(format: str) -> ExportFormat | None:
    return EXPORT_FORMATS.get(format)

def get_valid_formats() -> list[str]:
    return list(EXPORT_FORMATS.keys())

def get_builtin_theme_names() -> list[str]:
    return list(BUILTIN_THEMES.keys())

def get_theme_description(theme_name: str) -> str:
    return BUILTIN_THEMES.get(theme_name, "")
