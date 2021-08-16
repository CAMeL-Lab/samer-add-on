const level_to_color= {
  "0": '#ccccff',
  "2": '#89CFF0',
  "3": '#ccffcc',
  "4": '#ffff99',
  "5": '#ffcccc',
  "6": '#cfcfcf',
}

const eng_to_ar = {"0":"٠", "1": "١", "2": "٢", "3":"٣", "4":"٤", "5": "٥"}

/* What should the add-on do after it is installed */
function onInstall() {
  onOpen();
}

/* What should the add-on do when a document is opened */
function onOpen() {
  DocumentApp.getUi()
  .createAddonMenu() // Add a new option in the Google Docs Add-ons Menu
  .addItem("Launch SAMER", "showSidebar")
  .addToUi();  // Run the showSidebar function when someone clicks the menu 
}

/* Show a 300px sidebar with the HTML from googlemaps.html */
function showSidebar() {
  Logger.log("Inside show side bar")
  const html = HtmlService.createTemplateFromFile("samerSidebar")
    .evaluate()
    .setTitle("SAMER Simplify Markup"); // The title shows in the sidebar
  DocumentApp.getUi().showSidebar(html);
}

/* Load stuff from a javascript.html file  */
function include(filename) {
    return HtmlService.createTemplateFromFile(filename).getRawContent();
}

/* no console messages , logger is funky - use alert messagebox*/
function showAlert(msg) {
  const ui = DocumentApp.getUi().alert(msg); // Same variations.
}

function getTextStr(){
  let selection = DocumentApp.getActiveDocument().getSelection();

  if (selection) {
    let elements = selection.getRangeElements();
    let text = "";
    for (let rangeElement of elements){
      //check if element is text
      if (rangeElement.getElement().editAsText) {
        let element = rangeElement.getElement();
        let elementText = element.asText().getText();
        // Is only part of the paragraph selected?
        if (rangeElement.isPartial()){
          let startOffset = rangeElement.getStartOffset();    
          let endOffset = rangeElement.getEndOffsetInclusive();
          elementText = elementText.substring(startOffset,endOffset+1);
        }
        if(text === "") text = elementText;
        else text = text + " " + elementText;
      }
    }
    return text; 
  } else { 
    return DocumentApp.getActiveDocument().getBody().editAsText().getText();
  }
}

function addHash(eng_level){
  let level = eng_to_ar[eng_level]
  let selection = DocumentApp.getActiveDocument().getSelection();
  if (selection) {
    let elements = selection.getRangeElements();
    if (elements.length > 1)
      throw new Error("You have selected more than one word. Please select one word only.")
    let rangeElement = elements[0]
    if (!rangeElement.isPartial())
      throw new Error("You have selected more than one word. Please select one word only.")
    let elementText = rangeElement.getElement().editAsText();
    let text = rangeElement.getElement().asText().getText()
    let startOffset = rangeElement.getStartOffset();
    let endOffset = rangeElement.getEndOffsetInclusive();
    if (text.substring(startOffset,endOffset+1).split(" ").length > 1)
      throw new Error("You have selected more than one word. Please select one word only.")
    // check if there's already a hash
    if(text.substring(startOffset,endOffset+1).match(/^#[٠١٢٣٤٥]#/)){
      elementText.deleteText(startOffset, startOffset+2)
      elementText.insertText(startOffset, `#${level}#`)
      return elementText.getText().substring(startOffset,endOffset+1)
    }
    elementText.insertText(startOffset, `#${level}#`)
    return `#${level}#${text.substring(startOffset,endOffset+1)}`
  } else throw new Error("Please select a word.")
}

function replaceAll(word, eng_level){
  let level = eng_to_ar[eng_level]
  let regex_str = `^${word}[^ء-ي]+|[^ء-ي]+${word}[^ء-ي]+|[^ء-ي]+${word}$|^${word}$|#[٠١٢٣٤٥]#${word}$|#[٠١٢٣٤٥]#${word}[^ء-ي]`
  let replace_str = ` #${level}#${word} `
  DocumentApp.getActiveDocument().getBody().replaceText(regex_str, replace_str);
  return replace_str;
}

function highlightText(word, level) {
    let num_instances = 0
    const body = DocumentApp.getActiveDocument().getBody();
    // let regex_str = `^${word}[^ء-ي]+|[^ء-ي]+${word}[^ء-ي]+|[^ء-ي]+${word}$|^${word}$|#[٠١٢٣٤٥]#${word}$|#[٠١٢٣٤٥]#${word}[^ء-ي]`
    let regex_str = `((?:[^ء-ي]+|#[٠١٢٣٤٥]#|^)${word}(?:$|[^ء-ي]+))`
    let foundElement = body.findText(regex_str);
    while (foundElement != null) {
        // Get the text object from the element
        let foundText = foundElement.getElement().asText();

        // Where in the Element is the found text?
        let start = foundElement.getStartOffset() + 1;
        let end = foundElement.getEndOffsetInclusive() - 1;

        // Change the background color to yellow
        foundText.setBackgroundColor(start, end, level_to_color[level]);

        // Find the next match
        foundElement = body.findText(regex_str, foundElement);
        num_instances++;
    }
    return num_instances;
}


/* clear all annotation from document */
function clearAnnotation(){
  let selection = DocumentApp.getActiveDocument().getSelection();
  let text = "";

  if (selection) {
    let rangeElements = selection.getRangeElements();
    for (let rangeElement of rangeElements) {
      //if element is text
      if(rangeElement.getElement().editAsText){
        let element = rangeElement.getElement()
        text = element.editAsText();
        if(rangeElement.isPartial())
          text.setBackgroundColor(rangeElement.getStartOffset(), rangeElement.getEndOffsetInclusive(), null)
        else text.setBackgroundColor(0, text.getText().length-1,null);
      }
    }
  } else{
    text = DocumentApp.getActiveDocument().getBody().editAsText();
    text.setBackgroundColor(0, text.getText().length-1, null);
  }
}


// annotate the document
function annotateDoc(mrkpList,startindex,endindex,color, setLevel1){
  let text = "";
  let selection = DocumentApp.getActiveDocument().getSelection();
  
  if (selection) {
    let rangeElements = selection.getRangeElements();
    
    let startMrkpIdx = 0;
    let startIdx;
    let adjustStart = 0;
    let rawtext;

  //Each paragraph is an element
    for (let rangeElement of rangeElements) {
      // check if element is text
      if (rangeElement.getElement().editAsText) {
        // get text of element
        let element = rangeElement.getElement();
        text = element.asText().editAsText();
        // check if part of paragraph is selected
        if (rangeElement.isPartial()) 
          startIdx = rangeElement.getStartOffset()
        else startIdx = 0;

        startMrkpIdx=annotateText(mrkpList,text,color,startMrkpIdx,startIdx, adjustStart, setLevel1);
        if(!rawtext)
          rawtext = text.getText()
        else
          rawtext = rawtext + " " + text.getText();
        adjustStart= rawtext.length + 1; 
      }
    }
  } else {
     text = DocumentApp.getActiveDocument().getBody().editAsText(); //$("div.content").text();
     annotateText(mrkpList,text,color,0,0, 0, setLevel1);
  }
}

function annotateText(mrkpList,text,color,startMrkpIdx, startIdx, adjustStart, setLevel1){
  let textLength = text.getText().length 
  
  if (color != 'byword')
      text.setBackgroundColor(startMrkpIdx, textLength - 1, color);
    color = null;
    
    // Annotate a paragraph
    let i;
    for (i = startMrkpIdx; i < mrkpList.length && (mrkpList[i].endidx - adjustStart + startIdx) <= textLength; i++) {
      if(mrkpList[i].lvl !== 1){
        color = level_to_color[mrkpList[i].lvl.toString()]
        text.setBackgroundColor(mrkpList[i].idx - adjustStart + startIdx, mrkpList[i].endidx - adjustStart + startIdx, color);
      } else if(setLevel1){
        text.setBackgroundColor(mrkpList[i].idx - adjustStart + startIdx, mrkpList[i].endidx - adjustStart + startIdx, "#ffffff");
      }
      
    }
    return i;
  }
  


