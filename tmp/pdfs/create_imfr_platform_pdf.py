from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.utils import ImageReader
from reportlab.platypus import (
    BaseDocTemplate, Frame, PageBreak, Paragraph, Spacer, Table, TableStyle,
    KeepTogether,
)

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "output/pdf/imaginary-friends-platform-overview-swiftloop.pdf"
FONT = ROOT / "brand/logo/ClashDisplay-Semibold.ttf"
WORDMARK = ROOT / "brand/logo/swiftloop-wordmark-primary.png"

INK = colors.HexColor("#0A0A0C")
INK_2 = colors.HexColor("#101014")
BONE = colors.HexColor("#ECE8DF")
DIM = colors.HexColor("#97948B")
ACCENT = colors.HexColor("#FF4D1F")
LINE = colors.Color(0.925, 0.91, 0.875, alpha=0.15)
PAGE_W, PAGE_H = A4
MARGIN_X = 18 * mm

pdfmetrics.registerFont(TTFont("Clash", str(FONT)))

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(
    name="Kicker", fontName="Helvetica-Bold", fontSize=7.4, leading=10,
    textColor=ACCENT, spaceAfter=6, tracking=1.4,
))
styles.add(ParagraphStyle(
    name="SLTitle", fontName="Clash", fontSize=28, leading=31,
    textColor=BONE, spaceAfter=10,
))
styles.add(ParagraphStyle(
    name="Section", fontName="Clash", fontSize=20, leading=23,
    textColor=BONE, spaceAfter=12,
))
styles.add(ParagraphStyle(
    name="Body", fontName="Helvetica", fontSize=9.2, leading=14,
    textColor=BONE, spaceAfter=7,
))
styles.add(ParagraphStyle(
    name="Dim", parent=styles["Body"], textColor=DIM,
))
styles.add(ParagraphStyle(
    name="Small", fontName="Helvetica", fontSize=7.7, leading=10.5,
    textColor=DIM,
))
styles.add(ParagraphStyle(
    name="CardTitle", fontName="Clash", fontSize=12.3, leading=14,
    textColor=BONE, spaceAfter=5,
))
styles.add(ParagraphStyle(
    name="CardBody", fontName="Helvetica", fontSize=8.1, leading=11.5,
    textColor=DIM,
))
styles.add(ParagraphStyle(
    name="SLBullet", parent=styles["Body"], leftIndent=11, firstLineIndent=-8,
    bulletIndent=0, spaceBefore=0, spaceAfter=3,
))
styles.add(ParagraphStyle(
    name="TableHead", fontName="Helvetica-Bold", fontSize=7.2, leading=9,
    textColor=BONE,
))
styles.add(ParagraphStyle(
    name="TableCell", fontName="Helvetica", fontSize=7.4, leading=10,
    textColor=DIM,
))


def P(text, style="Body"):
    return Paragraph(text, styles[style])


def bullets(items):
    return [P(item, "SLBullet") for item in items]


def card(title, text, number=None):
    label = f'<font color="#FF4D1F">{number:02d}</font><br/>' if number else ""
    content = [P(label + title, "CardTitle"), P(text, "CardBody")]
    table = Table([[content]], colWidths=[82 * mm])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), INK_2),
        ("BOX", (0, 0), (-1, -1), 0.5, LINE),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 12),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
    ]))
    return table


def two_cards(a, b):
    table = Table([[a, b]], colWidths=[85 * mm, 85 * mm], hAlign="LEFT")
    table.setStyle(TableStyle([( "VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 0)]))
    return table


class PlatformDoc(BaseDocTemplate):
    def __init__(self, filename):
        frame = Frame(MARGIN_X, 17 * mm, PAGE_W - 2 * MARGIN_X, PAGE_H - 33 * mm, id="main")
        super().__init__(str(filename), pagesize=A4, leftMargin=0, rightMargin=0, topMargin=0, bottomMargin=0)
        from reportlab.platypus import PageTemplate
        self.addPageTemplates([PageTemplate(id="main", frames=[frame], onPage=self.decorate)])

    @staticmethod
    def decorate(canvas, doc):
        if doc.page == 1:
            cover(canvas, doc)
            return
        canvas.saveState()
        canvas.setFillColor(INK)
        canvas.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
        if doc.page > 1:
            canvas.setStrokeColor(LINE)
            canvas.setLineWidth(0.5)
            canvas.line(MARGIN_X, PAGE_H - 12 * mm, PAGE_W - MARGIN_X, PAGE_H - 12 * mm)
            canvas.setFillColor(DIM)
            canvas.setFont("Helvetica", 6.8)
            canvas.drawString(MARGIN_X, PAGE_H - 8.7 * mm, "SWIFTLOOP / PLATFORM OVERVIEW")
            canvas.setFillColor(ACCENT)
            canvas.drawRightString(PAGE_W - MARGIN_X, PAGE_H - 8.7 * mm, f"IMFR  {doc.page - 1:02d}")
            canvas.setFillColor(DIM)
            canvas.setFont("Helvetica", 6.7)
            canvas.drawString(MARGIN_X, 9 * mm, "Prepared by SwiftLoop")
            canvas.drawRightString(PAGE_W - MARGIN_X, 9 * mm, "Confidential client discussion document")
        canvas.restoreState()


def cover(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(INK)
    canvas.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    canvas.setStrokeColor(colors.Color(1, 0.30, 0.12, alpha=0.6))
    canvas.setLineWidth(1)
    canvas.circle(PAGE_W - 34 * mm, PAGE_H - 35 * mm, 12 * mm, stroke=1, fill=0)
    wordmark_width = 34 * mm
    wordmark_height = wordmark_width * 383 / 2000
    canvas.drawImage(ImageReader(str(WORDMARK)), MARGIN_X, PAGE_H - 22.2 * mm,
                     width=wordmark_width, height=wordmark_height, mask="auto")
    canvas.setFillColor(DIM)
    canvas.setFont("Helvetica-Bold", 7)
    canvas.drawRightString(PAGE_W - MARGIN_X, PAGE_H - 18 * mm, "CLIENT DISCUSSION / JULY 2026")
    canvas.setFillColor(ACCENT)
    canvas.setFont("Helvetica-Bold", 8)
    canvas.drawString(MARGIN_X, PAGE_H - 70 * mm, "IMAGINARY FRIENDS")
    canvas.setFillColor(BONE)
    canvas.setFont("Clash", 37)
    for i, line in enumerate(["A CONNECTED", "OPERATING", "PLATFORM"]):
        canvas.drawString(MARGIN_X, PAGE_H - (91 + i * 15) * mm, line)
    canvas.setFillColor(DIM)
    canvas.setFont("Helvetica", 11)
    canvas.drawString(MARGIN_X, 57 * mm, "A practical overview of the capabilities, connections and")
    canvas.drawString(MARGIN_X, 51 * mm, "time-saving workflows the new platform can introduce.")
    canvas.setStrokeColor(LINE)
    canvas.line(MARGIN_X, 31 * mm, PAGE_W - MARGIN_X, 31 * mm)
    canvas.setFillColor(BONE)
    canvas.setFont("Helvetica-Bold", 7.3)
    canvas.drawString(MARGIN_X, 21 * mm, "PREPARED BY SWIFTLOOP")
    canvas.setFillColor(DIM)
    canvas.setFont("Helvetica", 7.3)
    canvas.drawRightString(PAGE_W - MARGIN_X, 21 * mm, "swiftloop.tech")
    canvas.restoreState()


def make_doc():
    OUT.parent.mkdir(parents=True, exist_ok=True)
    doc = PlatformDoc(OUT)
    story = []
    # The first page uses a dedicated canvas cover; it still needs a small flowable.
    story.extend([Spacer(1, 10), PageBreak()])

    story += [P("01 / THE OPERATING FOUNDATION", "Kicker"), P("One connected source of information", "Section"),
              P("Talent, clients, deals, campaigns, tasks, content and payment progress will be managed through connected records. Information is entered once and shown wherever it is relevant - reducing duplicate work, conflicting information and the need to update multiple Notion pages manually.", "Dim"), Spacer(1, 4)]
    story.append(two_cards(
        card("Personalised and secure access", "Management can oversee agency operations. Managers see their assigned talent and campaigns. Finance sees invoicing and payment information. Talent sees only their own opportunities, tasks, deadlines and approved payment information. Internal notes, agency fees and information relating to other talent remain restricted.", 1),
        card("A central work queue", "Each person can see what needs attention today, what is approaching its deadline, what is overdue, what is awaiting approval, and the client, campaign or talent each task relates to. This removes the need to search separate pages and individual talent workspaces.", 2),
    ))
    story += [Spacer(1, 12), P("Designed to make the agency's operational picture clear without exposing sensitive information to the wrong people.", "Small"), Spacer(1, 18)]

    story += [P("02 / DELIVERY WORKFLOWS", "Kicker"), P("Guided from deal confirmation to payout", "Section"),
              P("The platform will guide the team through the normal stages of a deal or campaign. Once a deal is confirmed, it can prepare the standard actions and keep their progress visible.", "Dim"), Spacer(1, 5)]
    stages = ["Contract preparation and signature", "Brief and product delivery", "Content deadlines", "Internal review", "Client approval", "Publishing", "Evidence and analytics", "Invoicing", "Payment follow-up", "Talent payment"]
    stage_rows = []
    for i in range(0, len(stages), 2):
        row = [P(f'<font color="#FF4D1F">{i+1:02d}</font>  {stages[i]}', "Body")]
        if i + 1 < len(stages): row.append(P(f'<font color="#FF4D1F">{i+2:02d}</font>  {stages[i+1]}', "Body"))
        else: row.append(P("", "Body"))
        stage_rows.append(row)
    workflow = Table(stage_rows, colWidths=[85 * mm, 85 * mm])
    workflow.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), INK_2), ("GRID", (0, 0), (-1, -1), 0.5, LINE),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10), ("TOPPADDING", (0, 0), (-1, -1), 9), ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
    ]))
    story += [workflow, Spacer(1, 16), P("Deadline reminders and important alerts", "CardTitle"), P("The platform will monitor agreed dates and bring the appropriate actions to the right person: contracts awaiting signature, content and publishing deadlines, overdue drafts, approvals, invoices, talent payments, events and loan-return dates. Important decisions and external communications will continue to require human review.", "Dim"), PageBreak()]

    story += [P("03 / CONTENT AND FINANCE", "Kicker"), P("Clear approvals. Clear payment visibility.", "Section"),
              two_cards(
                  card("Connected content approvals", "Content is linked directly to its deal and deliverable. The clear progression is: Draft submitted -> internal review -> client review -> approved -> published. Previous versions, requested changes and approval decisions can be retained as a clear record of how final content was reached.", 3),
                  card("Invoicing and talent payments", "A connected view of what has been agreed, invoiced, outstanding and received - alongside what is payable to talent and what has been approved or transferred. This supports financial administration while working alongside existing accounting and banking arrangements.", 4),
              ), Spacer(1, 15), P("Organised documents and campaign files", "CardTitle"), P("Contracts, briefs, content files, invoices and payment evidence will be attached to the deal, campaign or task they relate to. Existing external folders can still be linked where appropriate, while the platform makes ownership and context easier to understand.", "Dim"), Spacer(1, 13), P("A clear activity history", "CardTitle"), P("Important changes can record what changed, who made the change, when it happened, what decision was approved, and whether a reminder or automated action was completed. This improves accountability when work passes between team members.", "Dim"), Spacer(1, 18)]

    story += [P("04 / PLANNED CONNECTIONS", "Kicker"), P("A controlled transition, not a disruptive switch", "Section"), P("The platform can work alongside the agency's current tools while progressively centralising the operational picture.", "Dim"), Spacer(1, 6)]
    connections = [
        ("Notion migration", "Prioritise active talent, clients, deals, tasks and campaigns. Identify duplicate or incomplete records for review rather than carrying them forward unchecked. Keep Notion available as a reference archive during transition."),
        ("Email notifications", "Selected notifications for task assignments, deadlines, approvals, overdue actions and daily or weekly summaries. Rules will be controlled to avoid unnecessary messages."),
        ("Secure document storage", "Store contracts, briefs, content assets, invoices and supporting documents, with the same permissions as the related deal, campaign or talent record."),
        ("Reports and exports", "Produce summaries of active deals, campaign progress, tasks, deadlines, invoices, talent payments and closeouts. Export information for finance, reporting or reconciliation when required."),
    ]
    for idx in range(0, len(connections), 2):
        a = card(connections[idx][0], connections[idx][1], idx + 1)
        if idx + 1 < len(connections):
            b = card(connections[idx+1][0], connections[idx+1][1], idx + 2)
            story += [two_cards(a, b), Spacer(1, 6)]
        else:
            story += [a, Spacer(1, 6)]
    story += [PageBreak()]

    story += [P("05 / EXAMPLES OF AUTOMATION", "Kicker"), P("Routine next steps, prepared consistently", "Section"), P("The purpose of automation is not to remove human control. It is to ensure routine next steps are prepared consistently and that important work is less likely to be missed.", "Dim"), Spacer(1, 7)]
    data = [[P("WHEN THIS HAPPENS", "TableHead"), P("THE PLATFORM CAN", "TableHead")]]
    automations = [
        ("A deal is confirmed", "Prepare the standard delivery checklist"),
        ("A contract remains unsigned", "Remind the responsible manager"),
        ("A content deadline approaches", "Notify the relevant talent and manager"),
        ("Content is submitted", "Create the internal review action"),
        ("Internal review is approved", "Move the content into client review"),
        ("Changes are requested", "Create and track a new revision"),
        ("Content is approved", "Add it to the publishing workflow"),
        ("Content is published", "Request the final link and analytics"),
        ("An invoice becomes overdue", "Flag it for follow-up"),
        ("Client payment is recorded", "Prepare the talent-payment action"),
        ("A task becomes overdue", "Bring it to management's attention"),
    ]
    data += [[P(a, "TableCell"), P(b, "TableCell")] for a, b in automations]
    table = Table(data, colWidths=[72 * mm, 98 * mm], repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), ACCENT), ("BACKGROUND", (0, 1), (-1, -1), INK_2),
        ("GRID", (0, 0), (-1, -1), 0.4, LINE), ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 9), ("RIGHTPADDING", (0, 0), (-1, -1), 9),
        ("TOPPADDING", (0, 0), (-1, -1), 10), ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
    ]))
    story += [table, PageBreak()]

    story += [P("06 / EXPECTED IMPACT", "Kicker"), P("More time for work that needs people", "Section"), P("The platform should reduce time currently spent entering the same information in several places, rebuilding routine task lists, checking separate talent workspaces, monitoring deadlines manually, searching for files and approvals, requesting routine updates, preparing internal summaries, and connecting client payments with talent payments.", "Dim"), Spacer(1, 12)]
    metric = Table([[P("5-12", "SLTitle"), P("administrative hours per week\nA reasonable initial objective across the team, based on the present workflow structure.", "Dim")]], colWidths=[48 * mm, 122 * mm])
    metric.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), INK_2), ("BOX", (0, 0), (-1, -1), 0.7, ACCENT),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("LEFTPADDING", (0, 0), (-1, -1), 13), ("RIGHTPADDING", (0, 0), (-1, -1), 13),
        ("TOPPADDING", (0, 0), (-1, -1), 17), ("BOTTOMPADDING", (0, 0), (-1, -1), 17),
    ]))
    story += [metric, Spacer(1, 15), two_cards(
        card("Operations", "Less repeated data entry, fewer rebuilt task lists, fewer routine status requests, and less time spent preparing internal progress summaries.", 1),
        card("Delivery and finance", "Less searching across talent workspaces, manual deadline monitoring, file and approval hunting, and client-to-talent payment tracking.", 2),
    ), Spacer(1, 15), P("How success will be assessed", "CardTitle"), P("Actual savings will depend on the volume of active talent, deals and campaigns. After launch, the platform will make it possible to review the operational improvements achieved and identify where further automation can create the greatest value.", "Dim"), Spacer(1, 16), P("The precise layout and delivery order will be refined during development. The capabilities in this overview establish the practical direction for a more connected, secure and accountable agency operating platform.", "Body")]

    doc.build(story)
    print(OUT)


if __name__ == "__main__":
    make_doc()
