"""
Minimal, dependency-free DOCX (Office Open XML) generator.

Produces a valid Word document using only the Python standard library
(zipfile + XML strings), so no python-docx dependency is required.
Supports right-to-left Hebrew paragraphs.
"""
import zipfile
from xml.sax.saxutils import escape

_CONTENT_TYPES = (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
    '<Default Extension="xml" ContentType="application/xml"/>'
    '<Override PartName="/word/document.xml" '
    'ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
    '</Types>'
)

_RELS = (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    '<Relationship Id="rId1" '
    'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" '
    'Target="word/document.xml"/>'
    '</Relationships>'
)


def _paragraph(text, bold=False, size=24, align='right'):
    """size is in half-points (24 = 12pt)."""
    bold_tag = '<w:b/>' if bold else ''
    return (
        f'<w:p><w:pPr><w:bidi/><w:jc w:val="{align}"/></w:pPr>'
        f'<w:r><w:rPr>{bold_tag}<w:rtl/><w:sz w:val="{size}"/><w:szCs w:val="{size}"/></w:rPr>'
        f'<w:t xml:space="preserve">{escape(str(text))}</w:t></w:r></w:p>'
    )


def generate_docx(output_path, title, lines):
    """
    Generate a simple DOCX file.

    :param output_path: destination .docx path
    :param title: document title (centered, bold)
    :param lines: iterable of either plain strings or (label, value) tuples
    """
    body = _paragraph(title, bold=True, size=36, align='center')
    body += _paragraph('', size=16)  # spacer

    for line in lines:
        if isinstance(line, (tuple, list)) and len(line) == 2:
            label, value = line
            body += _paragraph(f'{label} {value}', bold=False)
        else:
            body += _paragraph(line)

    document = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
        f'<w:body>{body}<w:sectPr><w:bidi/></w:sectPr></w:body>'
        '</w:document>'
    )

    with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as z:
        z.writestr('[Content_Types].xml', _CONTENT_TYPES)
        z.writestr('_rels/.rels', _RELS)
        z.writestr('word/document.xml', document)

    return output_path
