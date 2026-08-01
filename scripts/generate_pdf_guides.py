from fpdf import FPDF
import os

LOGO_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'Logo.jpeg')

GUIDES = [
    {
        'txt': 'downloads/gospel_conversation_guide.txt',
        'pdf': 'downloads/gospel_conversation_guide.pdf',
        'title': 'Gospel Conversation Guide',
        'subtitle': 'Bible-based conversation structure, practical questions, and scripture references to share the gospel with clarity.',
    },
    {
        'txt': 'downloads/baptism_outline.txt',
        'pdf': 'downloads/baptism_outline.pdf',
        'title': 'Baptism Outline',
        'subtitle': 'A Scripture-centered baptism plan with preparation, service flow, and next-step discipleship guidance.',
    },
    {
        'txt': 'downloads/7-day-discipleship-plan.txt',
        'pdf': 'downloads/7-day-discipleship-plan.pdf',
        'title': '7-Day Discipleship Plan',
        'subtitle': 'A one-week growth guide for new believers, with daily Scripture reading, reflection, and practical application.',
    },
]

class GuidePDF(FPDF):
    def add_logo(self, x=10, y=8, w=12, h=12, card=False):
        if os.path.exists(LOGO_PATH):
            if card:
                self.set_fill_color(255, 255, 255)
                self.set_draw_color(220, 220, 220)
                self.set_line_width(0.3)
                self.rect(x - 4, y - 4, w + 8, h + 8, 'FD')
            self.image(LOGO_PATH, x, y, w, h)

    def header(self):
        if self.page_no() > 1:
            self.add_logo(10, 8, 12, 12)
            self.set_font('Arial', 'B', 10)
            self.set_text_color(60, 60, 60)
            self.set_xy(25, 10)
            self.cell(0, 8, self.title, 0, 1, 'C')
            self.ln(2)

    def footer(self):
        self.set_y(-15)
        self.set_font('Arial', 'I', 8)
        self.set_text_color(120, 120, 120)
        self.cell(0, 5, 'Ingodspresence · Discipleship resources', 0, 1, 'L')
        self.cell(0, 5, f'Page {self.page_no()}', 0, 0, 'R')

    def add_title_page(self, title, subtitle):
        self.add_page()
        self.set_fill_color(246, 248, 251)
        self.rect(10, 10, 190, 277, 'F')

        self.set_fill_color(255, 255, 255)
        self.rect(28, 20, 154, 44, 'F')
        self.set_draw_color(225, 231, 240)
        self.set_line_width(0.3)
        self.rect(28, 20, 154, 44)

        self.add_logo(42, 24, 28, 28, card=False)
        self.set_text_color(12, 46, 84)
        self.set_font('Arial', 'B', 16)
        self.set_xy(78, 27)
        self.cell(0, 8, 'Ingodspresence', 0, 1, 'L')
        self.set_font('Arial', '', 10)
        self.set_text_color(95, 108, 125)
        self.set_xy(78, 37)
        self.cell(0, 6, 'Discipleship Resources', 0, 1, 'L')

        self.set_xy(15, 82)
        self.set_text_color(0, 30, 60)
        self.set_font('Arial', 'B', 24)
        self.multi_cell(self.w - 30, 12, title)
        self.ln(4)
        self.set_font('Arial', '', 13)
        self.set_text_color(70, 80, 95)
        self.multi_cell(self.w - 30, 8, subtitle)
        self.ln(12)
        self.set_fill_color(19, 109, 164)
        self.set_text_color(255, 255, 255)
        self.set_font('Arial', 'B', 11)
        self.cell(34, 8, 'PDF GUIDE', 0, 0, 'C', True)
        self.ln(24)
        self.set_font('Arial', 'I', 11)
        self.set_text_color(100, 100, 100)
        self.multi_cell(self.w - 30, 8, 'Engage with confidence, clarity, and Scripture-centered guidance.')
        self.ln(36)
        self.set_font('Arial', '', 10)
        self.set_text_color(150, 150, 150)
        self.cell(0, 6, 'Designed for Ingodspresence ministry leaders and volunteers.', 0, 1, 'C')

    def add_section_heading(self, text):
        self.set_font('Arial', 'B', 14)
        self.set_text_color(15, 45, 80)
        self.multi_cell(self.w - 20, 8, text)
        self.ln(2)
        self.set_draw_color(175, 175, 175)
        self.set_line_width(0.5)
        self.line(self.get_x(), self.get_y(), 190, self.get_y())
        self.ln(4)

    def add_paragraph(self, text):
        self.set_font('Arial', '', 12)
        self.set_text_color(25, 25, 25)
        self.multi_cell(self.w - 20, 7.5, text)
        self.ln(2)

    def add_bullet(self, text):
        self.set_font('Arial', '', 12)
        self.set_text_color(25, 25, 25)
        self.cell(5)
        self.cell(3, 7, '-', 0, 0)
        self.multi_cell(self.w - 25, 7, ' ' + text)


def clean_text(text):
    return text.replace('\u2018', "'").replace('\u2019', "'").replace('\u201c', '"').replace('\u201d', '"').replace('\u2013', '-').replace('\u2014', '-')


def parse_lines(lines):
    blocks = []
    for raw in lines:
        line = raw.strip()
        if not line:
            blocks.append(('space', ''))
        elif line.lower() in {'introduction', 'purpose', 'overview', 'benefits', 'practical tips', 'best practices', 'scripture references'}:
            blocks.append(('heading', line))
        elif line.startswith('Day ') or line[0].isdigit() and line[1] in ').':
            blocks.append(('heading', line))
        elif line.startswith('- '):
            blocks.append(('bullet', line[2:].strip()))
        else:
            blocks.append(('paragraph', line))
    return blocks


def build_pdf(guide):
    pdf = GuidePDF()
    pdf.set_title(guide['title'])
    pdf.title = guide['title']
    pdf.add_title_page(guide['title'], guide['subtitle'])
    pdf.add_page()

    with open(guide['txt'], 'r', encoding='utf-8') as f:
        lines = [clean_text(line) for line in f.readlines()]

    for block_type, content in parse_lines(lines):
        if block_type == 'space':
            pdf.ln(4)
        elif block_type == 'heading':
            pdf.add_section_heading(content)
        elif block_type == 'paragraph':
            pdf.add_paragraph(content)
        elif block_type == 'bullet':
            pdf.add_bullet(content)

    pdf.output(guide['pdf'])
    print(f'Created polished PDF: {guide['pdf']}')


def main():
    if not os.path.exists('downloads'):
        os.makedirs('downloads')

    for guide in GUIDES:
        build_pdf(guide)

if __name__ == '__main__':
    main()
