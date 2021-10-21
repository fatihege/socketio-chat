function replaceRegex(regex, replacement) {
    return function (str) {
        return str.replace(regex, replacement);
    }
}

var inlineCodeRegex = /(`)(.*?)\1/g;
var boldItalicsRegex = /(\*{1,2})(.*?)\1/g;
var strikethroughRegex = /(~~)(.*?)\1/g;
var underlineRegex = /(__)(.*?)\1/g;
var blockquoteRegex = /\n(&gt;|>)(.*)/g;
var paragraphRegex = /\n+(?!<pre>)(?!<h)(?!<ul>)(?!<blockquote)(?!<hr)(?!\t)([^\n]+)\n/g;

function inlineCodeReplacer(fullMatch, tagStart, tagContents) {
    return '<span class="code">' + tagContents + '</span>';
}

function boldItalicsReplacer(fullMatch, tagStart, tagContents) {
    return '<span class="' + ((tagStart.trim().length === 1) ? ('italic') : ('bold')) + '">' + tagContents + '</span>';
}

function strikethroughReplacer(fullMatch, tagStart, tagContents) {
    return '<span class="strikethrough">' + tagContents + '</span>';
}

function underlineReplacer(fullMatch, tagStart, tagContents) {
    return '<span class="underline">' + tagContents + '</span>';
}

function blockquoteReplacer(fullMatch, tagStart, tagContents) {
    return '\n<span class="blockquote">' + tagContents + '</span>';
}

function paragraphReplacer(fullMatch, tagContents) {
    return '<p>' + tagContents + '</p>';
}

var replaceInlineCodes = replaceRegex(inlineCodeRegex, inlineCodeReplacer);
var replaceBoldItalics = replaceRegex(boldItalicsRegex, boldItalicsReplacer);
var replaceStrikethrough = replaceRegex(strikethroughRegex, strikethroughReplacer);
var replaceUnderline = replaceRegex(underlineRegex, underlineReplacer);
var replaceBlockquotes = replaceRegex(blockquoteRegex, blockquoteReplacer);
var replaceParagraphs = replaceRegex(paragraphRegex, paragraphReplacer);

function replaceMarkdown(str) {
    return replaceParagraphs(
        replaceBlockquotes(
            replaceStrikethrough(
                replaceUnderline(
                    replaceBoldItalics(
                        replaceInlineCodes(
                            str
                        )
                    )
                )
            )
        )
    );
}

window.parseMarkdown = function (str) {
    return replaceMarkdown('\n' + str + '\n').trim();
}