// Stub for pdfmake
const createPDF = (fonts: any) => {
  return {
    createPdfKitDocument: (documentDefinition: any) => {
      const eventHandlers: any = {};
      
      return {
        pipe: (stream: any) => {},
        end: () => {
          if (eventHandlers['end']) {
            eventHandlers['end']();
          }
        },
        on: (event: string, handler: any) => {
          eventHandlers[event] = handler;
          if (event === 'end') {
            setTimeout(() => {
              handler();
            }, 100);
          }
          return this;
        }
      };
    }
  };
};

import path from 'path';
import fs from 'fs';
import config from '../config/config';

// Define the receipt PDF generator function
export const generateReceiptPdf = async (donation: any) => {
  try {    // Get logo if available
    let logoData: string | null = null;
    if (donation.ngo?.logo) {
      try {
        const logoPath = path.join(config.uploadDir, donation.ngo.logo);
        const logoBuffer = fs.readFileSync(logoPath);
        logoData = `data:image/png;base64,${logoBuffer.toString('base64')}`;
      } catch (error) {
        console.error('Error reading logo:', error);
      }
    }

    // Format donation date
    const donationDate = new Date(donation.createdAt).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    // Generate receipt number (can be customized based on your requirements)
    const receiptNumber = `RCPT-${donation._id.toString().slice(-8).toUpperCase()}`;
    
    // Create document definition
    const documentDefinition = {
      content: [
        {
          columns: [
            {
              width: '*',
              stack: [
                { text: donation.ngo?.name || 'NGO Name', style: 'header' },
                { text: donation.ngo?.address || 'NGO Address', style: 'subheader' },
                { text: `Registration No: ${donation.ngo?.registrationNumber || 'N/A'}`, style: 'subheader' },
                { text: `Email: ${donation.ngo?.email || 'N/A'}`, style: 'subheader' },
              ]
            },
            logoData ? {
              width: 100,
              image: logoData,
              alignment: 'right'
            } : {}
          ]
        },
        { text: 'DONATION RECEIPT', style: 'title', margin: [0, 20, 0, 10] },
        { text: `Receipt Number: ${receiptNumber}`, style: 'receiptDetails' },
        { text: `Date: ${donationDate}`, style: 'receiptDetails', margin: [0, 0, 0, 20] },
        
        // Donor details
        { text: 'Donor Information:', style: 'sectionHeader' },
        {
          columns: [
            {
              width: '30%',
              text: 'Name:',
              style: 'fieldLabel'
            },
            {
              width: '70%',
              text: donation.user?.name || 'Anonymous Donor',
              style: 'fieldValue'
            }
          ],
          margin: [0, 5, 0, 0]
        },
        {
          columns: [
            {
              width: '30%',
              text: 'Email:',
              style: 'fieldLabel'
            },
            {
              width: '70%',
              text: donation.user?.email || 'N/A',
              style: 'fieldValue'
            }
          ],
          margin: [0, 5, 0, 0]
        },
        
        // Donation details
        { text: 'Donation Details:', style: 'sectionHeader', margin: [0, 20, 0, 5] },
        {
          columns: [
            {
              width: '30%',
              text: 'Amount:',
              style: 'fieldLabel'
            },
            {
              width: '70%',
              text: `₹${donation.amount.toFixed(2)}`,
              style: 'fieldValue'
            }
          ],
          margin: [0, 5, 0, 0]
        },
        {
          columns: [
            {
              width: '30%',
              text: 'Payment ID:',
              style: 'fieldLabel'
            },
            {
              width: '70%',
              text: donation.paymentId || 'N/A',
              style: 'fieldValue'
            }
          ],
          margin: [0, 5, 0, 0]
        },
        {
          columns: [
            {
              width: '30%',
              text: 'Payment Method:',
              style: 'fieldLabel'
            },
            {
              width: '70%',
              text: 'Online Payment (Razorpay)',
              style: 'fieldValue'
            }
          ],
          margin: [0, 5, 0, 0]
        },
        
        // Thank you note
        { text: 'Thank You for Your Donation!', style: 'thankYou', margin: [0, 30, 0, 10] },
        { text: 'Your contribution makes a real difference in our mission to create positive impact. We appreciate your support!', style: 'message' },
        
        // Legal note
        { text: 'This is an electronically generated receipt and does not require a physical signature.', style: 'legalNote', margin: [0, 30, 0, 0] }
      ],
      styles: {
        header: {
          fontSize: 20,
          bold: true
        },
        subheader: {
          fontSize: 10,
          color: '#666666'
        },
        title: {
          fontSize: 18,
          bold: true,
          alignment: 'center',
          color: '#2563eb'
        },
        receiptDetails: {
          fontSize: 12,
          alignment: 'right'
        },
        sectionHeader: {
          fontSize: 14,
          bold: true,
          color: '#333333',
          margin: [0, 10, 0, 5]
        },
        fieldLabel: {
          fontSize: 12,
          bold: true
        },
        fieldValue: {
          fontSize: 12
        },
        thankYou: {
          fontSize: 14,
          bold: true,
          alignment: 'center',
          color: '#2563eb'
        },
        message: {
          fontSize: 12,
          alignment: 'center',
          italics: true
        },
        legalNote: {
          fontSize: 8,
          alignment: 'center',
          color: '#666666'
        }
      },
      defaultStyle: {
        font: 'Helvetica'
      },
      pageSize: 'A4',
      pageMargins: [40, 40, 40, 40]
    };

    // Create PDF
    const printer = createPDF({
      Helvetica: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
        italics: 'Helvetica-Oblique',
        bolditalics: 'Helvetica-BoldOblique'
      }
    });
    
    const pdfDoc = printer.createPdfKitDocument(documentDefinition);
    
    // Buffer to store the PDF
    const chunks: Buffer[] = [];
    
    return new Promise<Buffer>((resolve, reject) => {      pdfDoc.on('data', (chunk: any) => {
        chunks.push(chunk);
      });
      
      pdfDoc.on('end', () => {
        const result = Buffer.concat(chunks);
        resolve(result);
      });
      
      pdfDoc.on('error', (error: any) => {
        reject(error);
      });
      
      pdfDoc.end();
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};
