import {
    Document,
    Paragraph,
    TextRun,
    HeadingLevel,
    AlignmentType,
    ImageRun,
    Table,
    TableRow,
    TableCell,
    WidthType,
    PageBreak,
    SectionType,
    BorderStyle,
    VerticalAlign,
    TabStopType,
} from 'docx';
import type { Exam } from '../types';

type FallbackKazanım = { id: string; text: string };

// Build a deterministic queue of selected kazanımlar to backfill questions that miss metadata.
const buildFallbackKazanımQueue = (exam: Exam): FallbackKazanım[] => {
    const selection = exam?.settings?.selectedKazanims || {};
    return Object.entries(selection).flatMap(([id, item]) =>
        Array.from({ length: Math.max(1, item?.count || 1) }, () => ({ id, text: item?.text || '' })),
    );
};

// Helper to convert base64 to ArrayBuffer, which is required by docx's ImageRun
const base64ToBuffer = (base64: string): ArrayBuffer => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
};

export const createDocFromExam = async (
    exam: Exam,
    scenarioKey: string,
    subjectName: string,
    cleanTitleOverride?: string,
): Promise<Document> => {
    const scenario = exam.scenarios[scenarioKey];
    const cleanedTitle = cleanTitleOverride || exam.title.replace(/^\s*\d+\.?\s*Sınıf\s*/i, '').trimStart();
    
    // --- PAGE SETTINGS ---
    const pageProps = {
        page: {
            margin: { top: 720, bottom: 720, left: 720, right: 720 }, // ~0.5 inch margins
        },
    };

    // --- EXAM PAPER SECTION ---
    const examChildren: Paragraph[] = [];

    // Header (two lines, uppercase, uniform size)
    const headerLine1 = `${exam.academicYear} - ${exam.schoolName}`.toUpperCase();
    const headerLine2 = `${exam.grade}. SINIF ${subjectName} DERSI - ${cleanedTitle}`.toUpperCase();
    examChildren.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 40 },
        children: [new TextRun({ text: headerLine1, bold: true, size: 28 })],
    }));
    examChildren.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 80 },
        children: [new TextRun({ text: headerLine2, bold: true, size: 28 })],
    }));

    // Student Info Table
    const infoTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE }, insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE } },
        rows: [
            new TableRow({
                children: [
                    new TableCell({ children: [new Paragraph('ADI SOYADI: ..........................')], verticalAlign: VerticalAlign.CENTER }),
                    new TableCell({ children: [new Paragraph('NUMARA: .....')], verticalAlign: VerticalAlign.CENTER }),
                    new TableCell({ children: [new Paragraph('PUAN: .....')], verticalAlign: VerticalAlign.CENTER, alignment: AlignmentType.RIGHT }),
                ],
            }),
            new TableRow({
                children: [
                    new TableCell({ children: [new Paragraph('SINIF/ŞUBE: ...............')], verticalAlign: VerticalAlign.CENTER }),
                    new TableCell({ children: [new Paragraph('TARİH: .... / .... / ....')], verticalAlign: VerticalAlign.CENTER }),
                    new TableCell({ children: [new Paragraph('')], verticalAlign: VerticalAlign.CENTER }),
                ],
            }),
        ],
    });
    examChildren.push(infoTable);
    examChildren.push(new Paragraph({ text: '' })); // Spacer

    // Questions
    const fallbackKazanımQueue = buildFallbackKazanımQueue(exam);
    for (const [index, q] of scenario.entries()) {
        const fallbackKazanım = fallbackKazanımQueue[index];
        const effectiveKazanimText = (q.kazanimText?.trim() || fallbackKazanım?.text || '').trim();
        const effectiveKazanimId = q.kazanimId || fallbackKazanım?.id || '';
        const kazanimLabel = effectiveKazanimText
            ? `Kazanım: ${effectiveKazanimId ? `${effectiveKazanimId} - ` : ''}${effectiveKazanimText}`
            : effectiveKazanimId
                ? `Kazanım: ${effectiveKazanimId}`
                : 'Kazanım: (belirtilmedi)';
        const questionTextParts = q.questionStem.split('\n');

        // Section divider to mimic dotted guideline in the sample
        examChildren.push(new Paragraph({
            border: {
                bottom: { style: BorderStyle.DOTTED, size: 4, color: 'B3B3B3' },
                top: { style: BorderStyle.NONE },
                left: { style: BorderStyle.NONE },
                right: { style: BorderStyle.NONE },
            },
            spacing: { after: 80 },
        }));

        examChildren.push(new Paragraph({
            children: [new TextRun({ text: kazanimLabel, italics: true, size: 20, color: '666666' })],
            spacing: { after: 40 },
        }));

        // Question header with right-aligned point label (Soru X ...... (Y Puan))
        const questionHeader = new Paragraph({
            tabStops: [{ type: TabStopType.RIGHT, position: 9000 }],
            children: [
                new TextRun({ text: `Soru ${index + 1}:`, bold: true, size: 24 }),
                new TextRun({ text: '\t', size: 1 }),
                new TextRun({ text: `(${q.points} Puan)`, bold: true, size: 22 }),
            ],
            spacing: { after: 30 },
        });
        examChildren.push(questionHeader);

        const questionParagraph = new Paragraph({
            children: questionTextParts.flatMap((part, i) =>
                i > 0
                    ? [new TextRun({ text: part, break: 1, size: 22 })]
                    : [new TextRun({ text: part, size: 22 })]
            ),
            spacing: { after: q.userUploadedImage ? 40 : 80 },
        });
        examChildren.push(questionParagraph);

        if (q.userUploadedImage) {
            try {
                const imageBuffer = base64ToBuffer(q.userUploadedImage);
                const maxWidth = 500;
                const imageParagraph = new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                        new ImageRun({
                            data: imageBuffer,
                            transformation: {
                                width: maxWidth,
                                height: (maxWidth / 4) * 3,
                            },
                        }),
                    ],
                    spacing: { after: 200 },
                });
                examChildren.push(imageParagraph);
            } catch (e) {
                console.error('Failed to process image for docx:', e);
                examChildren.push(new Paragraph({
                    children: [new TextRun({ text: `[Görsel yüklenemedi: ${q.visualDescription || ''}]`, italic: true, size: 20, color: '888888' })],
                }));
            }
        }

        const answerLineCount = Math.max(2, Math.min(4, Math.ceil(q.questionStem.length / 110)));
        for (let i = 0; i < answerLineCount; i++) {
            examChildren.push(new Paragraph({
                children: [new TextRun({ text: '' })],
                border: {
                    bottom: { style: BorderStyle.DOTTED, size: 4, color: '9CA3AF' },
                    top: { style: BorderStyle.NONE },
                    left: { style: BorderStyle.NONE },
                    right: { style: BorderStyle.NONE },
                },
                spacing: { after: 40 },
            }));
        }
    }

    // --- ANSWER KEY SECTION ---
    const answerKeyChildren = [
        new Paragraph({ children: [new PageBreak()] }),
        new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 60 },
            children: [new TextRun({ text: exam.academicYear, bold: true, size: 24 })],
        }),
        new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 40 },
            children: [new TextRun({ text: exam.schoolName, bold: true, size: 28 })],
        }),
        new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 30 },
            children: [new TextRun({ text: `${exam.grade}. Sınıf ${subjectName} Dersi`, bold: true, size: 24 })],
        }),
        new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 80 },
            children: [new TextRun({ text: cleanedTitle, bold: true, size: 24 })],
        }),
        new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 120 },
            children: [new TextRun({ text: 'CEVAP ANAHTARI', bold: true, size: 28 })],
        }),
    ];

    for (const [index, q] of scenario.entries()) {
        answerKeyChildren.push(new Paragraph({
            children: [new TextRun({ text: `${index + 1}. Soru:`, bold: true, size: 22 })],
            spacing: { after: 40 },
        }));

        const answerParts = q.answer.split('\n');
        answerParts.forEach(part => {
            answerKeyChildren.push(new Paragraph({
                children: [new TextRun({ text: part, size: 22 })],
                indent: { left: 400 },
            }));
        });

        answerKeyChildren.push(new Paragraph({ text: '' }));
    }

    // --- DOCUMENT ASSEMBLY ---
    const doc = new Document({
        sections: [
            { // Exam Paper
                properties: { type: SectionType.NEXT_PAGE, ...pageProps },
                children: examChildren,
            },
            { // Answer Key
                properties: { type: SectionType.NEXT_PAGE, ...pageProps },
                children: answerKeyChildren,
            }
        ],
    });
    
    return doc;
};


