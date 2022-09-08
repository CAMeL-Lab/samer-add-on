const level_to_color= {
  "0": '#ccccff',
  "2": '#89CFF0',
  "3": '#ccffcc',
  "4": '#ffff99',
  "5": '#ffcccc',
  "6": '#cfcfcf',
}

const eng_to_ar = {"0":"٠", "1": "١", "2": "٢", "3":"٣", "4":"٤", "5": "٥", "6":"٦"}

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
  const html = HtmlService.createTemplateFromFile("samerSidebar")
    .evaluate()
    .setTitle("SAMER Readability Analysis"); // The title shows in the sidebar
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

function getTextStr(checkSelection=true){
  let selection = DocumentApp.getActiveDocument().getSelection();

  if (checkSelection && selection) {
    let elements = selection.getRangeElements();
    let text = "";
    let startOffset = 0;
    for (let rangeElement of elements){
      //check if element is text
      if (rangeElement.getElement().editAsText) {
        let element = rangeElement.getElement();
        let elementText = element.asText().getText();
        // Is only part of the paragraph selected?
        if (rangeElement.isPartial()){
          startOffset = rangeElement.getStartOffset();    
          let endOffset = rangeElement.getEndOffsetInclusive();
          // if part of a word is selected, look for whitespace boundary
          while (startOffset > 0){
            Logger.log(startOffset)
            if (elementText[startOffset].match(/\s/g)){
              startOffset+=1;
              break;
            }
              
            if (!elementText[startOffset].match(/\s/g))
              startOffset-=1;
          }

          while(endOffset < elementText.length){
            if(elementText[endOffset].match(/\s/g)){
              endOffset -= 1;
              break;
            }
              
            if (!elementText[endOffset].match(/\s/g))
              endOffset+=1;
          }

          elementText = elementText.substring(startOffset,endOffset+1);
          console.log(elementText);
        }
        if(text === "") text = elementText;
        else text = text + " " + elementText;
      }
    }
    return {text, startOffset}; 
  } else { 
    const text = DocumentApp.getActiveDocument().getBody().editAsText().getText()
    return {text,
            startOffset: 0};
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

    // todo: move this to getTextStr
    // if part of a word is selected, look for whitespace boundary
    while (startOffset > 0){
      Logger.log(startOffset)
      if (text[startOffset].match(/\s/g)){
        startOffset+=1;
        break;
      }
        
      if (!text[startOffset].match(/\s/g))
        startOffset-=1;
    }

    while(endOffset < text.length){
      if(text[endOffset].match(/\s/g)){
        endOffset -= 1;
        break;
      }
        
      if (!text[endOffset].match(/\s/g))
        endOffset+=1;
    }

    if (text.substring(startOffset,endOffset+1).split(" ").length > 1)
      throw new Error("You have selected more than one word. Please select one word only.")
    
    // check if there's already a hash
    let hash_regex = /#[٠١٢٣٤٥٦]#/
    let hash_position = text.substring(startOffset,endOffset+1).search(hash_regex)
    if(hash_position != -1){
      elementText.deleteText(startOffset + hash_position, startOffset + hash_position + 2)
      elementText.insertText(startOffset + hash_position, `#${level}#`)
      return {text: elementText.getText().substring(startOffset,endOffset+1), startOffset};
    }
    elementText.insertText(startOffset, `#${level}#`);
    const returnVal = `#${level}#${text.substring(startOffset,endOffset+1)}`;
    return {
      text: returnVal,
      startOffset}
  } else throw new Error("Please select a word.")
}

// todo: mke sure it doesn't replace punctuation around word
function replaceAll(word, eng_level){
  let level = eng_to_ar[eng_level]
  // solution here: https://stackoverflow.com/questions/30968419/replacetext-regex-not-followed-by/33528920#33528920
  let regex_str = `(^|(?!#)[[:punct:]]+|\\s+|«|»)(?:#[٠١٢٣٤٥٦]#)?${word}($|[[:punct:]]+|\\s+|«|»)`
  const body = DocumentApp.getActiveDocument().getBody();
  const pars = body.getParagraphs();
  for (let i=0; i < pars.length; i++) {
    let text = pars[i].getText();
    pars[i].replaceText(".*", text.replace(new RegExp(regex_str), `$1#${level}#${word}$2`) );
  }
  return `#${level}#${word}`;
}

function highlightText(word, level) {
    const ar_level = eng_to_ar[level]
    let num_instances = 0
    const body = DocumentApp.getActiveDocument().getBody();
    const regex_str = `#[٠١٢٣٤٥٦]#${word}[^ء-ي]`
    Logger.log(regex_str)
    let foundElement = body.findText(regex_str);
    while (foundElement != null) {
        Logger.log('found one element')
        // Get the text object from the element
        let foundText = foundElement.getElement().asText();
        
        // Where in the Element is the found text?
        let start = foundElement.getStartOffset();
        let end = foundElement.getEndOffsetInclusive();

        let hash_regex = new RegExp(`#[٠١٢٣٤٥٦]#${word}`)
        Logger.log(foundText.getText().substring(start,end))
        Logger.log(hash_regex)
        let match = hash_regex.exec(foundText.getText().substring(start,end))
        Logger.log(`found a match: ${match}`)
        if (match){
          start = start + match.index
          end = start + match[0].length - 1
            // Change the background color to yellow
          foundText.setBackgroundColor(start, end, level_to_color[level]);
          num_instances++;
        }

        // Find the next match
        foundElement = body.findText(regex_str, foundElement);
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
        else if (text.getText().length) 
          text.setBackgroundColor(0, text.getText().length-1,null);
      }
    }
  } else{
    text = DocumentApp.getActiveDocument().getBody().editAsText();
    text.setBackgroundColor(0, text.getText().length-1, null);
  }
}

function editTextBasedMarkupList(func, mrkpList, startOffset, add_args){
  const selection = DocumentApp.getActiveDocument().getSelection();
  
  if (selection) {
    const rangeElements = selection.getRangeElements();
    
    let startMrkpIdx = 0;
    let startIdx = startOffset;
    let adjustStart = 0;
    let rawtext;

    //Each paragraph is an element
    for (let rangeElement of rangeElements) {
      // check if element is text
      if (rangeElement.getElement().editAsText) {
        // get text of element
        let element = rangeElement.getElement();
        text = element.asText().editAsText();
        
        let res = func(mrkpList,text,startMrkpIdx,startIdx, adjustStart, add_args);
        startMrkpIdx = res[0]
        add_args = res[1]

        if(!rawtext){
          rawtext = text.getText()
        } else
          rawtext = rawtext + " " + text.getText();
        adjustStart = rawtext.length + 1; 
      }
    }
  } else {
     text = DocumentApp.getActiveDocument().getBody().editAsText(); //$("div.content").text();
     func(mrkpList,text,0,0, 0, add_args);
  }
}

function minimizeMarkup(mrkpList, startOffset){
  return editTextBasedMarkupList(minimizeMarkupInternal,mrkpList, startOffset, {})
}

function minimizeMarkupInternal(mrkpList, text,startMrkpIdx, startIdx, adjustStart, add_args){
  let i;
  let textLength = text.getText().length 
  // loop through each word
  for (i = startMrkpIdx; i < mrkpList.length && (mrkpList[i].endidx - adjustStart + startIdx) <= textLength; i++){
    let start = mrkpList[i].idx - adjustStart + startIdx
    let end = mrkpList[i].endidx - adjustStart + startIdx
    // select word text
    let word = text.getText().substring(start, end+1);
    // check if the text already has markup
    let found_index = /#[٠١٢٣٤٥٦]#/g.exec(word)
    if (found_index != null){
        // minimize font
      console.log(found_index)
        text.setFontSize(start + found_index.index, start + found_index.index + 2, 1);
    }
  }
  return [i, null];
}

function hideMarkup(mrkpList, startOffset){
  return editTextBasedMarkupList(hideMarkupInternal, mrkpList, startOffset, {"adjustWordIdx":0})
}

function hideMarkupInternal(mrkpList, text,startMrkpIdx, startIdx, adjustStart, add_args){
  let i;
  let textLength = text.getText().length 
  let {adjustWordIdx} = add_args;
  let currentFnAdjustWordIdx = 0

  // loop through each word
  for (i = startMrkpIdx; i < mrkpList.length && (mrkpList[i].endidx - adjustStart + startIdx) <= textLength + currentFnAdjustWordIdx; i++){
    
    let start = mrkpList[i].idx - adjustStart + startIdx
    let end = mrkpList[i].endidx - adjustStart + startIdx
    let editText = text.getText()
    // select word text
    let word = editText.substring(start, end+1);
    
    // check if the text already has markup
    let hash_match = /#[٠١٢٣٤٥٦]#/g.exec(word)
    if (hash_match != null){
      // if markup consistent with automatic marking
      if(mrkpList[i].lvl === mrkpList[i].actual_lvl){
        console.log(mrkpList[i].str, mrkpList[i].lvl, mrkpList[i].actual_lvl)
        // delete markup
        text.deleteText(hash_match.index + start, hash_match.index + start + 2);
        // update future word indices
        adjustWordIdx += 3;
        currentFnAdjustWordIdx -= 3
        mrkpList[i].endidx -= 3;
        // if the word is inconsistent with auto markup
      } else { 
        // delete old hash
        text.deleteText(hash_match.index + start, hash_match.index + start + 2)
        // insert new hash
        text.insertText(hash_match.index + start, `#${eng_to_ar[mrkpList[i].lvl]}#`)
        // minimize font
        // text.setFontSize(hash_match.index + start, hash_match.index + start + 2, 1);
      }
    }
    // update word indices
    if (i+1 < mrkpList.length){
      mrkpList[i+1].idx -= adjustWordIdx;
      mrkpList[i+1].endidx -= adjustWordIdx;
    }
  }
  return [i, {adjustWordIdx}]
}

function clearMarkup(mrkpList, startOffset){
  return editTextBasedMarkupList(clearMarkupInternal, mrkpList, startOffset, {"adjustWordIdx":0})
}

function clearMarkupInternal(mrkpList,text,startMrkpIdx,startIdx, adjustStart, add_args){
  let textLength = text.getText().length 
  let {adjustWordIdx} = add_args;
  let i;
  let currentFnAdjustWordIdx = 0

  for (i = startMrkpIdx; i < mrkpList.length && (mrkpList[i].endidx - adjustStart + startIdx) <= textLength + currentFnAdjustWordIdx; i++){
    let start = mrkpList[i].idx - adjustStart + startIdx
    let end = mrkpList[i].endidx - adjustStart + startIdx

    const word = text.getText().substring(start,end + 1);
      // check if the text already has markup
    let hash_match = /#[٠١٢٣٤٥٦]#/g.exec(word)
    if (hash_match != null){
        text.deleteText(start + hash_match.index, start + hash_match.index + 2);
        adjustWordIdx += 3;
        currentFnAdjustWordIdx -= 3;
        mrkpList[i].endidx -= 3;
      } 
      if (i+1 < mrkpList.length){
        mrkpList[i+1].idx -= adjustWordIdx;
        mrkpList[i+1].endidx -= adjustWordIdx;
      }
    }
  return [i, {adjustWordIdx}]
}

function showMarkup(mrkpList, startOffset){
  return editTextBasedMarkupList(showMarkupInternal, mrkpList, startOffset, {"adjustWordIdx":0})
}

function showMarkupInternal(mrkpList,text,startMrkpIdx,startIdx, adjustStart, add_args){
  let textLength = text.getText().length 
  let {adjustWordIdx} = add_args;
  let i;
  let currentFnAdjustWordIdx = 0
  for (i = startMrkpIdx; i < mrkpList.length && (mrkpList[i].endidx - adjustStart + startIdx) <= textLength + currentFnAdjustWordIdx; i++){
    let start = mrkpList[i].idx - adjustStart + startIdx
    let end = mrkpList[i].endidx - adjustStart + startIdx
    const word = text.getText().substring(start, end + 1);

    // check if the text already has markup
    let hash_match = /#[٠١٢٣٤٥٦]#/g.exec(word)
    if (hash_match == null){
      // insert markup
      text.insertText(start, `#${eng_to_ar[mrkpList[i].lvl]}#`);
      // adjust the indices of next words
      adjustWordIdx += 3;
      currentFnAdjustWordIdx += 3
      mrkpList[i].endidx += 3;

      // if text already has markup, update the font size
    } else {
      text.setFontSize(start + hash_match.index, start + hash_match.index + 2, text.getFontSize(start + hash_match.index + 3))
    }

    // adjust index of next word
    if (i+1 < mrkpList.length){
      mrkpList[i+1].idx += adjustWordIdx;
      mrkpList[i+1].endidx += adjustWordIdx;
    }
  }
  return [i, {adjustWordIdx}]
}

// annotate the document
function annotateDoc(mrkpList, startOffset, color, setLevel1){
  let text = "";
  let selection = DocumentApp.getActiveDocument().getSelection();
  
  if (selection) {
    let rangeElements = selection.getRangeElements();
    
    let startMrkpIdx = 0;
    let startIdx = startOffset;
    let adjustStart = 0;
    let rawtext;

  //Each paragraph is an element
    for (let rangeElement of rangeElements) {
      // check if element is text
      if (rangeElement.getElement().editAsText) {
        // get text of element
        let element = rangeElement.getElement();
        text = element.asText().editAsText();
        Logger.log(`text: ${text.getText()}`)
        startMrkpIdx=annotateText(mrkpList,text,color,startMrkpIdx,startIdx, adjustStart, setLevel1);
        if(!rawtext){
          rawtext = text.getText()
        } else
          rawtext = rawtext + " " + text.getText();
        if (rawtext.length)
          adjustStart = rawtext.length + 1; 
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
      // if not empty paragraph
      if(mrkpList[i].lvl !== 1){
        color = level_to_color[mrkpList[i].lvl.toString()]
        text.setBackgroundColor(mrkpList[i].idx - adjustStart + startIdx, mrkpList[i].endidx - adjustStart + startIdx, color);
      } else if(setLevel1){
        text.setBackgroundColor(mrkpList[i].idx - adjustStart + startIdx, mrkpList[i].endidx - adjustStart + startIdx, "#ffffff");
      }
    }
    return i;
  }
  


