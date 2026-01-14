from pathlib import Path
from app.services import marp_service
import pytest

def get_valid_markdown() -> str:
    return "---\nmarp: true\n---\n\n# Test Slide"

def test_validate_markdown_valid():
    assert marp_service.validate_markdown(get_valid_markdown()) is True

def test_validate_markdown_empty():
    assert marp_service.validate_markdown("") is False
    assert marp_service.validate_markdown("   ") is False

def test_create_temp_file():
    content = "test content"
    temp_file = marp_service.create_temp_file(content)
    try:
        assert temp_file.exists()
        assert temp_file.read_text() == content
    finally:
        temp_file.unlink(missing_ok=True)

def test_build_marp_cmd_basic():
    temp_file = Path("/tmp/test.md")
    cmd = marp_service.build_marp_cmd(temp_file, "--pdf", None, None)
    assert "--pdf" in cmd
    assert str(temp_file) in cmd

def test_build_marp_cmd_with_output():
    temp_file = Path("/tmp/test.md")
    cmd = marp_service.build_marp_cmd(temp_file, "--pdf", "/output/file.pdf", None)
    assert "-o" in cmd
    assert "/output/file.pdf" in cmd

def test_build_marp_cmd_with_theme():
    temp_file = Path("/tmp/test.md")
    cmd = marp_service.build_marp_cmd(temp_file, "--html", None, "default")
    assert "--theme" in cmd
    assert "default" in cmd

def test_render_to_html_invalid_content():
    with pytest.raises(ValueError):
        marp_service.render_to_html("")

def test_render_to_pdf_invalid_content():
    with pytest.raises(ValueError):
        marp_service.render_to_pdf("", Path("/tmp/test.pdf"))

def test_render_to_html_file_invalid_content():
    with pytest.raises(ValueError):
        marp_service.render_to_html_file("", Path("/tmp/test.html"))

def test_render_to_pptx_invalid_content():
    with pytest.raises(ValueError):
        marp_service.render_to_pptx("", Path("/tmp/test.pptx"))

def test_run_marp_command_failure(mocker):
    mock_result = mocker.Mock()
    mock_result.returncode = 1
    mock_result.stderr = "Marp command failed"
    mocker.patch("subprocess.run", return_value=mock_result)

    temp_file = Path("/tmp/test.md")
    temp_file.write_text("content")
    cmd = ["marp", str(temp_file)]

    with pytest.raises(RuntimeError, match="failed"):
        marp_service.run_marp_command(cmd, temp_file, "Test operation")

def test_render_to_html_marp_failure(mocker):
    mock_result = mocker.Mock()
    mock_result.returncode = 1
    mock_result.stderr = "Marp render error"
    mocker.patch("subprocess.run", return_value=mock_result)

    with pytest.raises(RuntimeError, match="Marp render failed"):
        marp_service.render_to_html(get_valid_markdown())

def test_render_to_pdf_marp_failure(mocker):
    mock_result = mocker.Mock()
    mock_result.returncode = 1
    mock_result.stderr = "PDF export error"
    mocker.patch("subprocess.run", return_value=mock_result)

    with pytest.raises(RuntimeError, match="PDF export failed"):
        marp_service.render_to_pdf(get_valid_markdown(), Path("/tmp/test.pdf"))

def test_render_to_html_file_marp_failure(mocker):
    mock_result = mocker.Mock()
    mock_result.returncode = 1
    mock_result.stderr = "HTML export error"
    mocker.patch("subprocess.run", return_value=mock_result)

    with pytest.raises(RuntimeError, match="HTML export failed"):
        marp_service.render_to_html_file(get_valid_markdown(), Path("/tmp/test.html"))

def test_render_to_pptx_marp_failure(mocker):
    mock_result = mocker.Mock()
    mock_result.returncode = 1
    mock_result.stderr = "PPTX export error"
    mocker.patch("subprocess.run", return_value=mock_result)

    with pytest.raises(RuntimeError, match="PPTX export failed"):
        marp_service.render_to_pptx(get_valid_markdown(), Path("/tmp/test.pptx"))

def test_render_to_html_success(mocker, tmp_path):
    mock_result = mocker.Mock()
    mock_result.returncode = 0
    mock_result.stdout = "<html>rendered content</html>"
    mocker.patch("subprocess.run", return_value=mock_result)

    html_content = "<html>rendered content</html>"
    html_file = tmp_path / "test.html"
    html_file.write_text(html_content)
    md_file = tmp_path / "test.md"
    md_file.write_text(get_valid_markdown())

    mkstemp_mock = mocker.patch("tempfile.mkstemp")
    mkstemp_mock.side_effect = [(1, str(md_file)), (2, str(html_file))]
    mocker.patch("os.close")
    mocker.patch("pathlib.Path.unlink")

    html = marp_service.render_to_html(get_valid_markdown())
    assert "<html>rendered content</html>" in html
    assert "mermaid" in html

def test_render_to_pdf_success(mocker, tmp_path):
    mock_result = mocker.Mock()
    mock_result.returncode = 0
    mocker.patch("subprocess.run", return_value=mock_result)

    output_path = tmp_path / "output.pdf"
    marp_service.render_to_pdf(get_valid_markdown(), output_path)

def test_render_to_html_file_success(mocker, tmp_path):
    mock_result = mocker.Mock()
    mock_result.returncode = 0
    mocker.patch("subprocess.run", return_value=mock_result)

    output_path = tmp_path / "output.html"
    marp_service.render_to_html_file(get_valid_markdown(), output_path)

def test_render_to_pptx_success(mocker, tmp_path):
    mock_result = mocker.Mock()
    mock_result.returncode = 0
    mocker.patch("subprocess.run", return_value=mock_result)

    output_path = tmp_path / "output.pptx"
    marp_service.render_to_pptx(get_valid_markdown(), output_path)
