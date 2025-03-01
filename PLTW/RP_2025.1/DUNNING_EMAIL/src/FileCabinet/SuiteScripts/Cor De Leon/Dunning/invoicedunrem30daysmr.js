/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope Public
 *
 */

define(['N/record', 'N/runtime', 'N/email', 'N/file', 'N/render', './NSUtilvSS2', 'N/search'],
   (record, runtime, email, file, render, nsutil, search) => {

      const getInputData = () => {
         const logTitle = 'getInputData';
         let arrLogDetails = [];

         try {
            arrLogDetails.push('*** Start getInputData ***');

            let today = new Date();
            const mainFolder = runtime.getCurrentScript().getParameter('custscript_pdffolder_30d');
            arrLogDetails.push(`Main Folder ID: ${mainFolder}`);

            let createdFolder = createFolder(mainFolder, today);
            arrLogDetails.push(`Created/Existing Folder ID: ${createdFolder}`);

            const invoiceSearchId = runtime.getCurrentScript().getParameter('custscript_invoicereminder30_ss');
            arrLogDetails.push(`Invoice Search ID: ${invoiceSearchId}`);

            let searchResults = nsutil.search(null, invoiceSearchId, null);
            arrLogDetails.push(`Search Results Count: ${searchResults.length}`);

            log.debug(logTitle, arrLogDetails.join(' | '));
            return searchResults;
         } catch (error) {
            log.error(logTitle, `Error: ${error}`);
         }
      };

      const map = (context) => {
         const logTitle = 'Map';
         let arrLogDetails = [];

         try {
            if (!isEmpty(context.value)) {
               let searchResult = JSON.parse(context.value);
               arrLogDetails.push(`Processing Record ID: ${searchResult.id}`);

               let entityId = searchResult.values.entity[0].value;
               let objValues = {
                  invoiceId: searchResult.id,
                  email: searchResult.values['customer.email'],
                  email2: searchResult.values['customer.custentity_acs_ap_email_2'],
                  email3: searchResult.values['customer.custentity_acs_ap_email_3'],
                  printInvoice: searchResult.values['customer.custentity_acs_print_invoice'],
                  emailInvoice: searchResult.values['customer.custentity_acs_email_invoice'],
                  excludeDunning: searchResult.values['customer.custentity_acs_exclude_from_dunning']
               };
               arrLogDetails.push(`Entity ID: ${entityId}, objValues: ${JSON.stringify(objValues)}`);

               context.write({
                  key: entityId,
                  value: objValues
               });
            } else {
               arrLogDetails.push('Skipping empty context value.');
            }

            log.debug(logTitle, arrLogDetails.join(' | '));
         } catch (error) {
            log.error(logTitle, `Error: ${error.message}`);
         }
      };

      const reduce = (context) => {
         const logTitle = 'Reduce';
         let arrLogDetails = [];

         try {
            let customerId = context.key;
            arrLogDetails.push(`Processing customer: ${customerId}`);

            let invoices = [];
            let receivers = [];
            const sender = runtime.getCurrentScript().getParameter('custscript_email_sender_30d');
            const emailTemplate = runtime.getCurrentScript().getParameter('custscript_email_template_30d');
            const invoiceTemplatePDFId = runtime.getCurrentScript().getParameter('custscript_inv_pdf_id_30d');

            arrLogDetails.push(`Sender: ${sender}, Email Template: ${emailTemplate}, PDF Template: ${invoiceTemplatePDFId}`);

            let objValue = JSON.parse(context.values[0]);
            let printInvoice = objValue.printInvoice;
            let emailInvoice = objValue.emailInvoice;
            let excludeDunning = objValue.excludeDunning;

            arrLogDetails.push(`Exclude Dunning: ${excludeDunning}, Print: ${printInvoice}, Email: ${emailInvoice}`);

            if (excludeDunning) {
               arrLogDetails.push(`Skipping customer ${customerId} due to Exclude from Dunning flag.`);
               log.debug(logTitle, arrLogDetails.join(' | '));
               return;
            }

            let invalidEmails = [];
            let validReceivers = [];

            context.values.forEach((value) => {
               let obj = JSON.parse(value);

               if (obj.email) {
                  if (isValidEmail(obj.email)) {
                        validReceivers.push(obj.email);
                  } else {
                        invalidEmails.push(obj.email);
                  }
               }

               if (obj.email2) {
                  if (isValidEmail(obj.email2)) {
                        validReceivers.push(obj.email2);
                  } else {
                        invalidEmails.push(obj.email2);
                  }
               }

               if (obj.email3) {
                  if (isValidEmail(obj.email3)) {
                        validReceivers.push(obj.email3);
                  } else {
                        invalidEmails.push(obj.email3);
                  }
               }

               invoices.push(obj.invoiceId);
            });

            // Convert validReceivers array into a comma-separated string
            let validReceiversString = validReceivers.join(",");

            arrLogDetails.push(`Invoices Count: ${invoices.length}, Receivers: ${validReceiversString}`);
            arrLogDetails.push(`Invalid Emails: ${invalidEmails.join(",")}`);

            let customer = record.load({ type: record.Type.CUSTOMER, id: customerId });

            let xmlString = '<pdfset>';
            invoices.forEach(invoiceId => {
               arrLogDetails.push(`Generating PDF for Invoice ID: ${invoiceId}`);

               let renderer = render.create();
               renderer.setTemplateById({ id: invoiceTemplatePDFId });

               let invoice = record.load({ type: record.Type.INVOICE, id: invoiceId });
               renderer.addRecord('record', invoice);

               let invoiceXml = renderer.renderAsString();
               invoiceXml = invoiceXml.replace(/<\?xml.+\?>|<!DOCTYPE.+">/g, '');
               xmlString += invoiceXml;
            });
            xmlString += '</pdfset>';

            let invoicePDF = render.xmlToPdf({ xmlString });
            invoicePDF.name = `${customer.getText('companyname')} - Invoices.pdf`;

            if (emailInvoice) {
               arrLogDetails.push(`Sending Email to: ${validReceiversString}`);
               // Ensure we only send emails to valid recipients
               if (validReceivers.length > 0) {
                  var emailRenderer = render.mergeEmail({
                     templateId: emailTemplate,
                     entity: customer
                  });

                  email.send({
                     author: sender,
                     recipients: validReceiversString, // Now a comma-separated string
                     subject: emailRenderer.subject,
                     body: emailRenderer.body,
                     attachments: [invoicePDF]
                  });
                  arrLogDetails.push(`Email sent successfully to: ${validReceiversString}`);
               } else {
                  arrLogDetails.push("No valid recipients. Email not sent.");
               }
           } else {
               arrLogDetails.push(`Saving Invoice PDF to File Cabinet.`);

               const mainFolder = runtime.getCurrentScript().getParameter('custscript_pdffolder_30d');
               let folder = createFolder(mainFolder, new Date());

               invoicePDF.folder = folder;
               invoicePDF.save();
               arrLogDetails.push(`Invoice PDF saved in folder ID: ${folder}`);
            }

            log.debug(logTitle, arrLogDetails.join(' | '));
         } catch (error) {
            log.error(logTitle, `Error: ${error.message}`);
         }
      };

      const summarize = (context) => {
         const logTitle = 'Summary';
         log.debug(logTitle, `*** Summarize Execution ***`);
      };

      const createFolder = (mainFolder, today) => {
         const logTitle = 'CreateFolder';
         let arrLogDetails = [];

         try {
            today = `${today.getMonth() + 1}/${today.getDate()}/${today.getFullYear()}`;
            arrLogDetails.push(`Checking Folder for Date: ${today}`);

            let folderSearch = search.createFilter({
               name: 'name',
               operator: search.Operator.CONTAINS,
               values: today
            });

            const reminderFolders = runtime.getCurrentScript().getParameter('custscript_folders_30d');
            let existingFolders = nsutil.search(null, reminderFolders, [folderSearch]);

            if (existingFolders.length === 0) {
               let folderRecord = record.create({ type: record.Type.FOLDER });
               folderRecord.setValue({ fieldId: 'name', value: today });
               folderRecord.setValue({ fieldId: 'parent', value: mainFolder });
               let folderId = folderRecord.save();
               arrLogDetails.push(`New Folder Created: ${folderId}`);
               log.debug(logTitle, arrLogDetails.join(' | '));
               return folderId;
            } else {
               let folderId = existingFolders[0].getValue({ name: 'internalid' });
               arrLogDetails.push(`Existing Folder ID: ${folderId}`);
               log.debug(logTitle, arrLogDetails.join(' | '));
               return folderId;
            }
         } catch (error) {
            log.error(logTitle, `Error: ${error}`);
         }
      };

      const isEmpty = (value) => {
         return value == null || value === '' || value === undefined || value === 'undefined';
      };
      
      const isValidEmail = (email) => {
         return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      }

      return {
         getInputData,
         map,
         reduce,
         summarize
      };
   }
);
