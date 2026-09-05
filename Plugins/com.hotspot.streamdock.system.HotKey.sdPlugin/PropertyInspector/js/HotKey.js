// "use strict";
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



let HotKey_Simple_Animation = 0;
let timer_1 = null
let HotKey_Current_Value = '';
let Key_Value_Log = [];
let Cursor_Position = [];
let Key_Time_Log = [];
let Record_Status = localStorage.getItem('Record_Status') || '{}'
Record_Status = JSON.parse(Record_Status)
// console.log("首个: ", Record_Status);
let Last_Key_Time = 0
let settings = {}
// let Is_HotKey_Change = 0;

//也是软件发过来的事件 /* 插件触发的事件 */  
$SD.on('sendToPropertyInspector', e => {
    // console.log(e);
    let { event, payload } = e
    /* 插件设置数据后触发 */
    if (event === 'sendToPropertyInspector') {
        // choice_VolumeNameItem  =   payload.settings.content.choice_VolumeNameItem 解构赋值

        let {
            RecordKeyValue,
            KeyBoardValue,
            MouseValue,
            Reset_Record_Status
            // ,Last_Time
            , Close_Hook
        } = e.payload
        if (RecordKeyValue) {
            // let Return_Value = RecordKeyValue.split('/')
            // $('#RecordKey_Value').innerHTML = Enum_KeyValue[Return_Value[1]] || '请输入录制键'
            $('#RecordKey_Value').innerHTML = Enum_KeyValue[RecordKeyValue] || '请输入录制键'
            settings.RecordKeyValue_Save = RecordKeyValue; //$('#RecordKey_Value').innerHTML
            saveData(1);
        }
        else if (KeyBoardValue) {
            let Return_Value = KeyBoardValue.split('/')
            let This_Record_Status = Record_Status[context] || 0
            // console.log("其次: ", Record_Status);
            // console.log(This_Record_Status);
            if (
                Enum_KeyValue[Return_Value[1]] == $('#RecordKey_Value').innerHTML
                && (Return_Value[0] == 0 || Return_Value[0] == 1 || Return_Value[0] == 16)
                && This_Record_Status % 4 == 0
            ) {
                $('#Record_Log').value = '';
                $('#HotKey').innerHTML = '开始录制...';

                settings.Record_Log = $('#Record_Log').value;
                settings.HotKey = $('#HotKey').innerHTML;
                Key_Value_Log = [];
                Key_Time_Log = [];
                Cursor_Position = [];
                settings.Key_Value_Log_Save = Key_Value_Log;
                settings.Key_Time_Log_Save = Key_Time_Log;
                settings.Cursor_Position_Save = Cursor_Position;
                saveData(2);
                This_Record_Status++;
                Record_Status[context] = This_Record_Status;
                localStorage.setItem('Record_Status', JSON.stringify(Record_Status));

                Last_Key_Time = Return_Value[2];
                // Is_HotKey_Change = 0;

                console.log(Enum_KeyValue[Return_Value[1]]);
                console.log(Return_Value[0]);
                console.log(This_Record_Status);

                return;
            }
            else if (
                Enum_KeyValue[Return_Value[1]] == $('#RecordKey_Value').innerHTML
                && (Return_Value[0] == 128 || Return_Value[0] == 129 || Return_Value[0] == 144)
                && This_Record_Status % 4 == 1
            ) {
                // Record_Status++;
                // localStorage.setItem('Record_Status', Record_Status);
                This_Record_Status++;
                Record_Status[context] = This_Record_Status;
                localStorage.setItem('Record_Status', JSON.stringify(Record_Status));

                console.log(Enum_KeyValue[Return_Value[1]]);
                console.log(Return_Value[0]);
                console.log(This_Record_Status);

                return;
            }
            else if (
                Enum_KeyValue[Return_Value[1]] == $('#RecordKey_Value').innerHTML
                && (Return_Value[0] == 0 || Return_Value[0] == 1 || Return_Value[0] == 16)
                && This_Record_Status % 4 == 2
            ) {
                // clearTimeout(timer_1);
                clearInterval(timer_1);

                $('#HotKey').innerHTML = '结束录制...';
                settings.HotKey = $('#HotKey').innerHTML;
                saveData(3);
                // Record_Status++;
                // localStorage.setItem('Record_Status', Record_Status);
                This_Record_Status++;
                Record_Status[context] = This_Record_Status;
                localStorage.setItem('Record_Status', JSON.stringify(Record_Status));

                // Last_Key_Time = Return_Value[2];

                console.log(Enum_KeyValue[Return_Value[1]]);
                console.log(Return_Value[0]);
                console.log(This_Record_Status);

                return;
            }
            else if (
                Enum_KeyValue[Return_Value[1]] == $('#RecordKey_Value').innerHTML
                && (Return_Value[0] == 128 || Return_Value[0] == 129 || Return_Value[0] == 144)
                && This_Record_Status % 4 == 3
            ) {
                // Record_Status++;
                // Record_Status %= 4;
                // localStorage.setItem('Record_Status', Record_Status);
                This_Record_Status++;
                This_Record_Status %= 4;
                Record_Status[context] = This_Record_Status;
                localStorage.setItem('Record_Status', JSON.stringify(Record_Status));

                // localStorage.setItem('Record_Status',localStorage.getItem('Record_Status') + 2);
                // localStorage.clear();
                // localStorage.removeItem('Record_Status');

                delete Record_Status[context];

                localStorage.setItem('Record_Status', JSON.stringify(Record_Status));

                console.log(Enum_KeyValue[Return_Value[1]]);
                console.log(Return_Value[0]);
                console.log(This_Record_Status);

                return;
            }
            else {
                console.log(Enum_KeyValue[Return_Value[1]]);
                console.log(Return_Value[0]);
                console.log(This_Record_Status);
                // return;
            }


            // if (Record_Status % 4 == 0) {
            //     Record_Status += 2;
            //     Record_Status %= 4;
            //     localStorage.setItem('Record_Status', localStorage.getItem('Record_Status') + 2)
            // }

            if (This_Record_Status % 4 == 0) {
                This_Record_Status += 2;
                This_Record_Status %= 4;
                Record_Status[context] = This_Record_Status;
                localStorage.setItem('Record_Status', JSON.stringify(Record_Status));
            }

            //上次按键时间重现
            // if (Last_Key_Time == 0 && Key_Time_Log.length != 0)  //获取时间戳
            // {
            //     Last_Key_Time = Return_Value[2];
            //     // Key_Time_Log.pop();
            //     // Last_Key_Time = Record_Status[context + 'LastTime'];
            // }
            // // Record_Status[context + 'LastTime'] = Return_Value[2];
            // // localStorage.setItem('Record_Status', JSON.stringify(Record_Status));


            Key_Value_Log.push(Return_Value[1]);
            settings.Key_Value_Log_Save = Key_Value_Log;
            Key_Time_Log.push(Return_Value[2] - Last_Key_Time);
            settings.Key_Time_Log_Save = Key_Time_Log;
            // saveData();    //1

            console.log(Key_Time_Log);

            // Return_Value.length = 3;
            let status = ''
            if (Return_Value[0] == 0 || Return_Value[0] == 1 || Return_Value[0] == 16)
                status = '按下了';
            else if (Return_Value[0] == 128 || Return_Value[0] == 129 || Return_Value[0] == 144)
                status = '抬起了';
            $('#HotKey').innerHTML = `${status}  ${Enum_KeyValue[Return_Value[1]]} (${Return_Value[2] - Last_Key_Time}ms)`
            HotKey_Current_Value = $('#HotKey').innerHTML;

            // clearTimeout(timer_1);
            clearInterval(timer_1);

            HotKey_Simple_Animation = 0;
            timer_1 = setInterval(() => {
                if (HotKey_Simple_Animation == 0) {
                    $('#HotKey').innerHTML = HotKey_Current_Value + '记录中.';
                    HotKey_Simple_Animation++;
                    HotKey_Simple_Animation %= 4;
                }
                else if (HotKey_Simple_Animation == 1) {
                    $('#HotKey').innerHTML = HotKey_Current_Value + '记录中..';
                    HotKey_Simple_Animation++;
                    HotKey_Simple_Animation %= 4;
                }
                else if (HotKey_Simple_Animation == 2) {
                    $('#HotKey').innerHTML = HotKey_Current_Value + '记录中...';
                    HotKey_Simple_Animation++;
                    HotKey_Simple_Animation %= 4;
                }
                else if (HotKey_Simple_Animation == 3) {
                    $('#HotKey').innerHTML = HotKey_Current_Value + '记录中....';
                    HotKey_Simple_Animation++;
                    HotKey_Simple_Animation %= 4;
                }
                settings.HotKey = $('#HotKey').innerHTML;
                // saveData();
            }, 600)
            $('#HotKey').innerHTML = HotKey_Current_Value + '记录中';
            settings.HotKey = $('#HotKey').innerHTML;
            // saveData();  //2
            Last_Key_Time = Return_Value[2]

            if ($('#Record_Log').value != '')
                $('#Record_Log').value += ' + ';
            $('#Record_Log').value += Enum_KeyValue[Return_Value[1]]
            if (Return_Value[0] == 0 || Return_Value[0] == 1 || Return_Value[0] == 16)
                $('#Record_Log').value += '↓'
            else if (Return_Value[0] == 128 || Return_Value[0] == 129 || Return_Value[0] == 144)
                $('#Record_Log').value += '↑'
            settings.Record_Log = $('#Record_Log').value;
            saveData(4);


        }
        else if (MouseValue) {
            let Return_Value = MouseValue.split('/')

            //上次按键时间重现
            // if (Last_Key_Time == 0 && Key_Time_Log.length != 0)  //获取时间戳
            // {
            //     Last_Key_Time = Return_Value[3];
            //     // Key_Time_Log.pop();
            //     // Last_Key_Time = Record_Status[context + 'LastTime'];
            // }
            // // Record_Status[context + 'LastTime'] = Return_Value[3];
            // // localStorage.setItem('Record_Status', JSON.stringify(Record_Status));

            Key_Value_Log.push(Return_Value[0]);
            settings.Key_Value_Log_Save = Key_Value_Log;
            Key_Time_Log.push(Return_Value[3] - Last_Key_Time);
            settings.Key_Time_Log_Save = Key_Time_Log;
            Cursor_Position.push(`(${Return_Value[1]} , ${Return_Value[2]})`);
            settings.Cursor_Position_Save = Cursor_Position;
            // saveData();  //3

            // console.log(Key_Time_Log);

            // Return_Value.length = 3;

            $('#HotKey').innerHTML = `${Enum_KeyValue[Return_Value[0]]} ${Return_Value[1]} , ${Return_Value[2]} (${Return_Value[3] - Last_Key_Time}ms)`
            HotKey_Current_Value = $('#HotKey').innerHTML;

            // clearTimeout(timer_1);
            clearInterval(timer_1);

            HotKey_Simple_Animation = 0;
            timer_1 = setInterval(() => {
                if (HotKey_Simple_Animation == 0) {
                    $('#HotKey').innerHTML = HotKey_Current_Value + '记录中.';
                    HotKey_Simple_Animation++;
                    HotKey_Simple_Animation %= 4;
                }
                else if (HotKey_Simple_Animation == 1) {
                    $('#HotKey').innerHTML = HotKey_Current_Value + '记录中..';
                    HotKey_Simple_Animation++;
                    HotKey_Simple_Animation %= 4;
                }
                else if (HotKey_Simple_Animation == 2) {
                    $('#HotKey').innerHTML = HotKey_Current_Value + '记录中...';
                    HotKey_Simple_Animation++;
                    HotKey_Simple_Animation %= 4;
                }
                else if (HotKey_Simple_Animation == 3) {
                    $('#HotKey').innerHTML = HotKey_Current_Value + '记录中....';
                    HotKey_Simple_Animation++;
                    HotKey_Simple_Animation %= 4;
                }
                settings.HotKey = $('#HotKey').innerHTML;
                // saveData();
            }, 600)
            $('#HotKey').innerHTML = HotKey_Current_Value + '记录中';
            settings.HotKey = $('#HotKey').innerHTML;
            // saveData();  //4
            Last_Key_Time = Return_Value[3]

            if ($('#Record_Log').value != '')
                $('#Record_Log').value += ' + ';
            $('#Record_Log').value += Enum_KeyValue[Return_Value[0]]
            // console.log(11);
            // if (Return_Value[0] == 0 || Return_Value[0] == 1)
            //     $('#Record_Log').value += '↓'
            // else if (Return_Value[0] == 128 || Return_Value[0] == 129)
            //     $('#Record_Log').value += '↑'
            settings.Record_Log = $('#Record_Log').value;
            saveData(5);

            // console.log(1);
            // console.log($('#Record_Log').value);
        }
        else if (Reset_Record_Status) {

            // if($('#HotKey').innerHTML != '休眠中(点此按钮或插件恢复)')
            // {
            //     Record_Status[context] = 0;
            //     localStorage.setItem('Record_Status', JSON.stringify(Record_Status));
            //     $('#HotKey').innerHTML = '结束录制';
            //     // settings.HotKey = $('#HotKey').innerHTML;
            //     settings.HotKey = '结束录制';
            //     saveData(6);
            //     clearTimeout(timer_1);
            // }

            Record_Status[context] = 0;
            localStorage.setItem('Record_Status', JSON.stringify(Record_Status));
            $('#HotKey').innerHTML = '结束录制';
            // settings.HotKey = $('#HotKey').innerHTML;
            settings.HotKey = '结束录制';
            saveData(6);
            // clearTimeout(timer_1);
            clearInterval(timer_1);

        }
        else if (e.payload.Last_Time) {
            Last_Key_Time = e.payload.Last_Time;
            // Is_HotKey_Change++;
        }
        else if (Close_Hook) {
            Record_Status[context] = 0;
            localStorage.setItem('Record_Status', JSON.stringify(Record_Status));

            $('#HotKey').innerHTML = '休眠中(点此按钮或插件恢复)';
            settings.HotKey = $('#HotKey').innerHTML;
            saveData(7);

            // clearTimeout(timer_1);
            clearInterval(timer_1);

        }

    }
    //split

    if (event === 'didReceiveSettings') {
        // var state;
        // if (typeof e.payload.state === "number") {
        //     state = e.payload.state + "";
        // } else {
        //     state = e.payload.state;
        // }
        // $('#beckgroundItem').value = state || '0'
        $('.sdpi-wrapper').style.display = 'block'


        settings = payload.settings
        let {
            RecordKeyValue_Save,
            HotKey,
            Record_Log,
            Key_Value_Log_Save,
            Key_Time_Log_Save,
            Cursor_Position_Save
        } = settings    // choice_VolumeNameItem  =   payload.settings.content.choice_VolumeNameItem 解构赋值


        $('#RecordKey_Value').innerHTML = Enum_KeyValue[RecordKeyValue_Save] || '请输入录制键'

        let This_Record_Status = localStorage.getItem('Record_Status') || '{}'
        This_Record_Status = JSON.parse(This_Record_Status)
        // if(Is_HotKey_Change == 0)
        // if (This_Record_Status[context] != 0)
        $('#HotKey').innerHTML = HotKey || '按键开始录制'
        $('#Record_Log').value = Record_Log || ''
        Key_Value_Log = Key_Value_Log_Save || []
        Key_Time_Log = Key_Time_Log_Save || []
        Cursor_Position = Cursor_Position_Save || []


        // $('#Record_Log').value = '';

        // let count = 0;

        // if( count < Key_Value_Log.length && Key_Value_Log_Save[])

        // if ($('#Record_Log').value != '')
        //     $('#Record_Log').value += '+';
        // $('#Record_Log').value += Enum_KeyValue[Return_Value[1]]
        // if (Return_Value[0] == 0 || Return_Value[0] == 1)
        //     $('#Record_Log').value += '↓'
        // else if (Return_Value[0] == 128 || Return_Value[0] == 129)
        //     $('#Record_Log').value += '↑'
        // settings.Record_Log = $('#Record_Log').value;


        // if ($('#Record_Log').value != '')
        //     $('#Record_Log').value += '+';
        // $('#Record_Log').value += Enum_KeyValue[Return_Value[0]]
        // console.log(11);
        // settings.Record_Log = $('#Record_Log').value;


        // $SD.api.sendToPlugin(uuid, action, {
        //     propertyInspectorDidAppear: settings
        // })

    }
})


/* 保存数据 */
function saveData(x) {
    $SD.api.setSettings(context, settings)
    // console.log(x);
}

function SetRecordKey() {
    $SD.api.sendToPlugin(uuid, action, {
        Set_RecordKey: 'Set_RecordKey'
    })
}

function Restore_Hook() {
    $SD.api.sendToPlugin(uuid, action, {
        Restore_Hook: 'Restore_Hook'
    })
    $('#HotKey').innerHTML = '插件已恢复';
    settings.HotKey = $('#HotKey').innerHTML;
    saveData(8);
}


