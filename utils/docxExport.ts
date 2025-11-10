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
} from 'docx';
import type { Exam } from '../types';

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

export const createDocFromExam = async (exam: Exam, scenarioKey: string, subjectName: string): Promise<Document> => {
    const scenario = exam.scenarios[scenarioKey];
    
    // --- EXAM PAPER SECTION ---
    const examChildren = [];

    // Header
    examChildren.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: exam.academicYear, bold: true, size: 24 })] }));
    examChildren.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: exam.schoolName, bold: true, size: 28 })] }));
    examChildren.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${exam.grade}. Sınıf ${subjectName} Dersi ${exam.title}`, bold: true, size: 24 })] }));
    examChildren.push(new Paragraph({ text: "" })); // Spacer

    // Student Info Table
    const infoTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE }, insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE } },
        rows: [
            new TableRow({
                children: [
                    new TableCell({ children: [new Paragraph("Adı Soyadı: ..........................")], verticalAlign: VerticalAlign.CENTER }),
                    new TableCell({ children: [new Paragraph("Sınıfı: ..... No: .....")], verticalAlign: VerticalAlign.CENTER }),
                    new TableCell({ children: [new Paragraph("Puan: .....")], verticalAlign: VerticalAlign.CENTER, alignment: AlignmentType.RIGHT }),
                ],
            }),
        ],
    });
    examChildren.push(infoTable);
    examChildren.push(new Paragraph({ text: "" })); // Spacer

    // Questions
    for (const [index, q] of scenario.entries()) {
        const questionTextParts = q.questionStem.split('\n');
        
        const questionParagraph = new Paragraph({
            children: [
                new TextRun({ text: `${index + 1}) (${q.points} Puan) `, bold: true, size: 22 }),
                ...questionTextParts.flatMap((part, i) => i > 0 ? [new TextRun({ text: part, break: 1, size: 22 })] : [new TextRun({ text: part, size: 22 })])
            ],
            spacing: { after: 100 }
        });
        examChildren.push(questionParagraph);

        if (q.userUploadedImage) {
            try {
                const imageBuffer = base64ToBuffer(q.userUploadedImage);
                // Simple dimension calculation to fit on a page (approx. A4 width in DXA)
                const maxWidth = 500; 
                const imageParagraph = new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                        new ImageRun({
                            data: imageBuffer,
                            transformation: {
                                width: maxWidth,
                                height: (maxWidth / 4) * 3, // Assuming 4:3 ratio, adjust as needed
                            },
                        }),
                    ],
                    spacing: { after: 200 }
                });
                examChildren.push(imageParagraph);
            } catch (e) {
                console.error("Failed to process image for docx:", e);
                examChildren.push(new Paragraph({
                    children: [new TextRun({ text: `[Görsel yüklenemedi: ${q.visualDescription}]`, italic: true, size: 20, color: "888888" })]
                }));
            }
        }
        
        // Add space for answers
        for(let i=0; i < 5; i++) { // Add 5 blank lines for writing
            examChildren.push(new Paragraph({ text: "" }));
        }
    }

    // --- ANSWER KEY SECTION ---
    const answerKeyChildren = [
        new Paragraph({ text: "", children: [new PageBreak()] }),
        new Paragraph({ text: "CEVAP ANAHTARI", heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }),
        new Paragraph({ text: "" })
    ];

    for (const [index, q] of scenario.entries()) {
        answerKeyChildren.push(new Paragraph({
             children: [new TextRun({ text: `${index + 1}. Soru:`, bold: true, size: 22 })],
             spacing: { after: 100 }
        }));
        
        const answerParts = q.answer.split('\n');
        answerParts.forEach(part => {
             answerKeyChildren.push(new Paragraph({
                 children: [new TextRun({ text: part, size: 22 })],
                 indent: { left: 400 },
             }));
        });
         answerKeyChildren.push(new Paragraph({ text: "" })); // Spacer
    }


    // --- DOCUMENT ASSEMBLY ---
    const doc = new Document({
        sections: [
            { // Exam Paper
                properties: { type: SectionType.NEXT_PAGE },
                children: examChildren,
            },
            { // Answer Key
                properties: { type: SectionType.NEXT_PAGE },
                children: answerKeyChildren,
            }
        ],
    });
    
    return doc;
};
