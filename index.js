import { getStringHash, debounce} from '../../../utils.js';
import { getContext,extension_settings} from '../../../extensions.js';
import { animation_duration, eventSource, event_types, extension_prompt_types,is_send_press, saveSettingsDebounced} from '../../../../script.js';
import { loadMovingUIState } from '../../../power-user.js';
import { dragElement } from '../../../RossAscends-mods.js';
export { MODULE_NAME };

const MODULE_NAME = 'status';

let lastCharacterId = null;
let lastGroupId = null;
let lastChatId = null;
let lastMessageHash = null;
let lastMessageId = null;
//Enum泛型
const status_sources = {
    'extras': 'extras',
    'main': 'main',
};

const saveChatDebounced = debounce(() => getContext().saveChat(), 2000);
const defaultTemplate = '{{status}}';
const defaultPreview = `
<details style="font-family: Arial, sans-serif; padding: 15px; background-color: #333; border: 1px solid #555; border-radius: 5px; margin-bottom: 20px; color: white;">
<summary style="cursor: pointer; font-weight: bold;">状态栏</summary>
<div>
    {{defaultStyle1}}
</div>
<div>
    {{defaultStyle2}}
</div>
</details>
`
const defaultStyle1 = `
<p style="margin: 16px 0; line-height: 1.5;">
    <strong>{{KEY}}：</strong>{{VALUE}}<br>
</p>
`
const defaultStyle2 = `
<div style="background-color: #555; border-radius: 10px; padding: 3px;">
    <div id="good-feeling-bar" style="width:{{VALUE}};height: 20px; background-color: #4CAF50; border-radius: 8px; text-align: center; line-height: 20px; color:white;">{{KEY}}</div>
</div>
<br>
`;
function parseToJSON(chat) {
    let regex1KEY = /<strong>([\s\S]*?)\：/g
    let regex1VALUE = /<\/strong>([\s\S]*?)<br>/g
    let regex2KEY = /color:white;">([\s\S]*?)<\/div>/g
    let regex2VALUE = /style\=\"width\:([\s\S]*?);height\:/g

    
    const jsonResult = {};

    const matchesStyle1KEY = [...chat.matchAll(regex1KEY)];
    const matchesStyle1VALUE = [...chat.matchAll(regex1VALUE)];
    const matchesStyle2KEY = [...chat.matchAll(regex2KEY)];
    const matchesStyle2VALUE = [...chat.matchAll(regex2VALUE)];
    for(let i = 0;i < matchesStyle1KEY.length ;i++){
        jsonResult[matchesStyle1KEY[i][1]] = matchesStyle1VALUE[i][1];
    }
    for(let i = 0;i < matchesStyle2KEY.length ;i++){
        jsonResult[matchesStyle2KEY[i][1]] = matchesStyle2VALUE[i][1];
    }
    return jsonResult;
}
const defaultSettings = {
    source: status_sources.main,
    prevew: defaultPreview,
    stroageData: {
        "好感度": 0,
    },
    autoSave: true,
    template: defaultTemplate,
    position: extension_prompt_types.IN_PROMPT,
    depth: 1
};

//加载设置_
function loadSettings() {
    
    if (extension_settings.status === undefined) {
        extension_settings.status = defaultSettings;
    }
    console.log(extension_settings);
    for (const key of Object.keys(defaultSettings)) {
        if (extension_settings.status[key] === undefined) {
            extension_settings.status[key] = defaultSettings[key];
        }
    }

    $('#status_source').val(extension_settings.status.source).trigger('change');
    $('#status_preview').val(extension_settings.status.preview).trigger('input');

    $('#status_stroageData').val(JSON.stringify(extension_settings.status.stroageData)).trigger('input');

    $('#status_autoSave').prop('checked', extension_settings.status.autoSave).trigger('input');
    $('#status_position').val( extension_settings.status.position).trigger('input');
    $('#status_template').val(extension_settings.status.template).trigger('input');
    $('#status_depth').val(extension_settings.status.depth).trigger('input');
    $(`input[name="status_position"][value="${extension_settings.status.position}"]`).prop('checked', true).trigger('input');

    switchSourceControls(extension_settings.status.source);
}

function onstatusSourceChange(event) {
    const value = event.target.value;
    extension_settings.status.source = value;
    switchSourceControls(value);
    saveSettingsDebounced();
}

function switchSourceControls(value) {
    $('#status_settings [data-source]').each((_, element) => {
        const source = $(element).data('source');
        $(element).toggle(source === value);
    });
}
function onstatusTemplateInput() {
    const value = $(this).val();
    extension_settings.status.template = value;
    reinsertstatus();
    saveSettingsDebounced();
}
function onstatusDepthInput() {
    const value = $(this).val();
    extension_settings.status.depth = Number(value);
    reinsertstatus();
    saveSettingsDebounced();
}
function onstatusStroageDataInput(){
    const value = $(this).val();
    extension_settings.status.stroageData = JSON.parse(value);
    console.log(extension_settings.status)
    reinsertstatus();
    saveSettingsDebounced();
}
function onAutoSave(){
    const value = Boolean($(this).prop('checked'));
    extension_settings.status.autoSave = value;
    saveSettingsDebounced();
}
function onstatusPositionChange(e) {
    const value = e.target.value;
    extension_settings.status.position = value;
    reinsertstatus();
    saveSettingsDebounced();
}
function saveLastValues() {
    const context = getContext();
    lastGroupId = context.groupId;
    lastCharacterId = context.characterId;
    lastChatId = context.chatId;
    lastMessageId = context.chat?.length ?? null;
    lastMessageHash = getStringHash((context.chat.length && context.chat[context.chat.length - 1]['mes']) ?? '');
}
function getLateststatusFromChat() {
    
    const chat = getContext().chat
    if (!Array.isArray(chat) || !chat.length) {
        return '';
    }
    for(let i = chat.length-1;i>=0;i++){
        const match = chat[i].mes.match(/<Status>([\s\S]*?)<\/Status>/);
        const extractedContent = match ? match[1] : null;
        return '<Status>'+extractedContent+'<Status>'
    }
    return '';
}


function reinsertstatus() {
    const existingValue = generateStatusBarHTML(extension_settings.status.stroageData);
    setstatusContext(existingValue, false);
}
function isRegexMatchedStatus(string) {
    return /<Status>[\s\S]*<\/Status>/.test(string);
}
function setstatusContext(value, saveToMessage) {
    // 未选择任何角色或组
    if (!context.groupId && context.characterId === undefined) {
        return;
    }

    // 生成正在进行中，停止
    if (is_send_press) {
        return;
    }

    // 聊天/角色/群组已更改
    if ((context.groupId && lastGroupId !== context.groupId) || (context.characterId !== lastCharacterId) || (context.chatId !== lastChatId)) {
        return;
    }


    // 没有消息 - 不执行任何操作
    if (chat.length === 0 || (lastMessageId === chat.length && getStringHash(chat[chat.length - 1].mes) === lastMessageHash)) {
        return;
    }
    
    const chat = getContext().chat;
    console.log(chat)
    let depth = extension_settings.status.depth;
    let position = extension_settings.status.position;
    // context.setExtensionPrompt(MODULE_NAME, formatstatusValue(value), extension_settings.status.position, extension_settings.status.depth);
    console.log('位置1: ' + position);
    console.log('深度2: ' + depth);
    //新增
    if(position == 2){
        let length = chat.length;
        for(let i = length - 1; depth >= 0; depth-=1){
            if(isRegexMatchedStatus(chat[i].mes)) continue;
            else{
                chat[i].mes = chat[i].mes + value;
                saveChatDebounced();
            }
        }
    }
    else if(position == 0){
        let length = chat.length;
        for(let i = length - 1;depth >= 0; depth-=1){

            if(isRegexMatchedStatus(chat[i].mes)) continue;
            else{
                chat[i].mes = value + chat[i].mes;
                saveChatDebounced();
            }
        }
    }
    //移除
    depth = extension_settings.status.depth;
    let length = chat.length;
    for(let i = 0 ;i <= length - depth -1; i+=1){
        if(!isRegexMatchedStatus(chat[i].mes)) continue;
        else{
            chat[i].mes = chat[i].mes.replace(/<Status>[\s\S]*<\/Status>/g, '');
            chat[i].mes = chat[i].mes.replaceAll('<Status>', '');
            chat[i].mes = chat[i].mes.replaceAll('</Status>', '');
            saveChatDebounced();
        }
    }
    saveChatDebounced();
}

function doPopout(e) {
    const target = e.target;
    //将缩放的头像模板重新调整为浮动 div
    if ($('#statusExtensionPopout').length === 0) {
        console.debug('did not see popout yet, creating');
        const originalHTMLClone = $(target).parent().parent().parent().find('.inline-drawer-content').html();
        const originalElement = $(target).parent().parent().parent().find('.inline-drawer-content');
        const template = $('#zoomed_avatar_template').html();
        const controlBarHtml = `<div class="panelControlBar flex-container">
        <div id="statusExtensionPopoutheader" class="fa-solid fa-grip drag-grabber hoverglow"></div>
        <div id="statusExtensionPopoutClose" class="fa-solid fa-circle-xmark hoverglow dragClose"></div>
    </div>`;
        const newElement = $(template);
        newElement.attr('id', 'statusExtensionPopout')
            .removeClass('zoomed_avatar')
            .addClass('draggable')
            .empty();
        const prevstatusBoxContents = generateStatusBarHTML(extension_settings.status.stroageData)
        originalElement.empty();
        originalElement.html('<div class="flex-container alignitemscenter justifyCenter wide100p"><small>Currently popped out</small></div>');
        newElement.append(controlBarHtml).append(originalHTMLClone);
        $('body').append(newElement);
        //重点在这
        $('#statusExtensionDrawerContents').addClass('scrollableInnerFull');
        setstatusContext(prevstatusBoxContents, false); //paste prev status box contents into popout box
        setupListeners();
        loadSettings();
        loadMovingUIState();

        $('#statusExtensionPopout').fadeIn(animation_duration);
        dragElement(newElement);

        //setup listener for close button to restore extensions menu
        $('#statusExtensionPopoutClose').off('click').on('click', function () {
            $('#statusExtensionDrawerContents').removeClass('scrollableInnerFull');
            const statusPopoutHTML = $('#statusExtensionDrawerContents');
            $('#statusExtensionPopout').fadeOut(animation_duration, () => {
                originalElement.empty();
                originalElement.html(statusPopoutHTML);
                $('#statusExtensionPopout').remove();
            });
            loadSettings();
        });
    } else {
        console.debug('saw existing popout, removing');
        $('#statusExtensionPopout').fadeOut(animation_duration, () => { $('#statusExtensionPopoutClose').trigger('click'); });
    }
}
function generateStatusBarHTML(statusJSON) {
    let innerPart1 = '';
    let innerPart2 = ''
    for (const [key, value] of Object.entries(statusJSON)) {
        if (typeof value === 'string' && value.trim().endsWith('%')) {
            let template = defaultStyle2.replaceAll('{{KEY}}', key).replaceAll('{{VALUE}}', value);
            innerPart1 += template;
        } else {
            let template = defaultStyle1.replaceAll('{{KEY}}', key).replaceAll('{{VALUE}}', value);
            innerPart2 += template;
        }
    }

    let finalHTML = '<Status>'+defaultPreview.replace('{{defaultStyle2}}', innerPart1).replace('{{defaultStyle1}}', innerPart2)+'</Status>';
    return finalHTML;
}
function setupListeners() {
    $('#status_source').off('click').on('change', onstatusSourceChange);
    $('#status_stroageData').off('click').on('input', onstatusStroageDataInput);
    $('#status_template').off('click').on('input', onstatusTemplateInput);
    $('#status_depth').off('click').on('input', onstatusDepthInput);
    $('#status_autoNewSave').off('click').on('input',onAutoSave);
    $('input[name="status_position"]').off('click').on('change', onstatusPositionChange);
    $('#statusPreview').off('click').on('click', function () {        
        const statusHTML = generateStatusBarHTML(extension_settings.status.stroageData);
        $('#statusPreviewBlock').empty();
        $('#statusPreviewBlock').append(statusHTML);
        $('#statusPreviewBlock').slideToggle(200, 'swing');
    });
    $('#statusSettingsBlockToggle').off('click').on('click', function () {
        $('#statusSettingsBlock').slideToggle(200, 'swing');
    });
}

function saveStatus(){
    const chat = getContext().chat;
    const match = chat[chat.length-1].mes.match(/<Status>([\s\S]*?)<\/Status>/);
    const extractedContent = match ? match[1] : null;
    console.log(extractedContent)
    if(extractedContent !== null){
        extension_settings.status.stroageData = parseToJSON(extractedContent);
        $('#status_stroageData').val(JSON.stringify(extension_settings.status.stroageData)).trigger('input');
        saveSettingsDebounced();
    }
}
jQuery(function () {
    function addExtensionControls() {
        const settingsHtml = `
        <div id="status_settings">
    <div class="inline-drawer">
        <div class="inline-drawer-toggle inline-drawer-header">
            <div class="flex-container alignitemscenter margin0"><b>状态栏</b><i id="statusExtensionPopoutButton" class="fa-solid fa-window-restore menu_button margin0"></i></div>
            <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
        </div>
        <div class="inline-drawer-content">
            <div id="statusExtensionDrawerContents">
                <div class="container">

                    <div id="statusPreview" class="menu_button menu_button_icon">
                        <i class="fa-solid fa-cog"></i>
                        <span>状态栏预览</span>
                    </div>

                    <div id="statusPreviewBlock" style="display:none;">
                        <!--状态栏预览-->
                    </div>
                    
                    <span>存储数据</span>

                    <div id="statusDataBlock">
                        <textarea id="status_stroageData" class="text_pole textarea_compact" rows="6" placeholder="使用JSON格式"></textarea>
                    </div>

                    <div class="status_contents_controls">
                        <div id="statusSettingsBlockToggle" class="menu_button menu_button_icon" title="编辑插入位置等">
                            <i class="fa-solid fa-cog"></i>
                            <span>插件设置</span>
                        </div>
                    </div>
                    <div id="statusSettingsBlock" style="display:none;">
                        <div class="status_template">
                            <label for="status_template">插入模板</label>
                            <textarea id="status_template" class="text_pole textarea_compact" rows="2" placeholder="{{status}}将解析为当前摘要内容。"></textarea>
                        </div>
                        <label for="status_position">插入位置</label>
                        <div class="radio_group">
                            <label>
                                <input type="radio" name="status_position" value="2" />
                                内容前
                            </label>
                            <label>
                                <input type="radio" name="status_position" value="0" />
                                内容后
                            </label>
                            <label for="status_depth">
                                <input type="radio"/>
                                保留语句数量 <input id="status_depth" class="text_pole widthUnset" type="number" min="0" max="999" />
                            </label>
                        </div>
                        <div data-source="main" class="status_contents_controls">
                        </div>
                        <div data-source="main">
                            <label for="status_prompt" class="title_restorable">
                            提示词
                            </label>
                            <textarea id="status_prompt" class="text_pole textarea_compact" rows="6" placeholder="Test"></textarea>
                        </div>

                        <div class="status_autoSave">
                            <label for="status_autoSave" title="是否自动更新">
                                自动更新: <input id="status_autoSave" type="checkbox" /></label>
                        </div>
                    </div>
                  </div>
            </div>
        </div>
    </div>
</div>


        `;
        $('#extensions_settings2').append(settingsHtml);
        setupListeners();
        //默认关闭
        $('#statusExtensionPopoutButton').off('click').on('click', function (e) {
            doPopout(e);
            e.stopPropagation();
        });
    }

    addExtensionControls();
    loadSettings();
    //消息接收
    eventSource.on(event_types.MESSAGE_RECEIVED, function(e){
        saveStatus();
        reinsertstatus();
        console.log("消息接收")
    });
    //消息删除
    eventSource.on(event_types.MESSAGE_DELETED, function(){
        reinsertstatus();
        console.log("消息删除")
    });
    //消息编辑
    eventSource.on(event_types.MESSAGE_EDITED, function(){
        reinsertstatus();
        console.log("消息编辑")
    });
    //消息切换
    eventSource.on(event_types.MESSAGE_SWIPED, function(){
        reinsertstatus();
        console.log("消息切换")
    });
    //消息更改
    eventSource.on(event_types.CHAT_CHANGED, function(){
        reinsertstatus();
        console.log("消息更改")
    });
});
