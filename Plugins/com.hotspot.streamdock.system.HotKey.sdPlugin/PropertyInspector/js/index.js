let uuid = '', action = '', context = '';
/* 初始化 */
$SD.on('connected', e => {
    uuid = e.uuid;
    action = e.actionInfo.action;
    context = e.actionInfo.context;
    // localAll()
})

/* 更新状态 */
function updateState() {
    var intState;
    if (typeof $('#beckgroundItem').value === "string") {
        intState = parseInt($('#beckgroundItem').value);
    } else {
        intState = $('#beckgroundItem').value;
    }
    $SD.api.send(context, 'setState', {
        payload: {
            state: intState
        }
    });
}

/* 刷新显示 */
$SD.on('sendToPropertyInspector', e => {
    console.log(e)
    if (e.event === 'didReceiveSettings') {
        var state;
        if (typeof e.payload.state === "number") {
            state = e.payload.state + "";
        } else {
            state = e.payload.state;
        }
        $('#beckgroundItem').value = state || '0'
        $('.sdpi-wrapper').style.display = 'block'
    }
})
