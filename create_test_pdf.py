from reportlab.pdfgen import canvas

def create_pdf(filename, content):
    c = canvas.Canvas(filename)
    c.drawString(100, 750, content)
    c.save()

if __name__ == "__main__":
    create_pdf("test_document.pdf", "The secret password for Seekonix is: ALBATROSS-99.")
