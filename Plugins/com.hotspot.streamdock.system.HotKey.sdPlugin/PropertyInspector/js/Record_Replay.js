// "use strict";
let uuid = '', action = '', context = '';
/* 初始化 */
$SD.on('connected', e => {
    uuid = e.uuid;
    action = e.actionInfo.action;
    context = e.actionInfo.context;
    // localAll()
})

class EventPlus {
    constructor() {
        this.event = new EventTarget()
    }
    on(name, callback) {
        this.event.addEventListener(name, e => {
            callback(e.detail)
        })
    }
    send(name, data) {
        this.event.dispatchEvent(new CustomEvent(name, {
            detail: data,
            bubbles: false,
            cancelable: false
        }))
    }
}
let $event = new EventPlus()

let File_Path = "";
//10
// let count = 0;
// let Is_Change = false;
// //11
// string[count] = 
// string[count]={Load_Config_input2}

const onFilePickerReturn = (url) => {
    File_Path = JSON.parse(url)[0];

    $SD.api.sendToPlugin(uuid, action, {
        Load_Config_List: File_Path
    });
    // count++;
    // Is_Change = true;

    $('#Still_Press').checked = false;

}
// Load_Config_input2

/* 更新状态 */
// function updateState() {
//     var intState;
//     if (typeof $('#beckgroundItem').value === "string") {
//         intState = parseInt($('#beckgroundItem').value);
//     } else {
//         intState = $('#beckgroundItem').value;
//     }
//     $SD.api.send(context, 'setState', {
//         payload: {
//             state: intState
//         }
//     });
// }

// let Current_Delete_Config_Name = '';

let Empty_Config_List = false; _

let HotKey_Simple_Animation = 0;
let timer_1 = null
let HotKey_Current_Value = '';
let Key_Value_Log = [];
let Cursor_Position = [];
let Key_Time_Log = [];
// let Record_Status = localStorage.getItem('Record_Status') || '{}'
// Record_Status = JSON.parse(Record_Status)
// console.log("首个: ", Record_Status);
let Last_Key_Time = 0
let settings = {}
// let Is_HotKey_Change = 0;

let KeyBoard_Event_Num = 0;
let Mouse_Event_Num = 0;
let Current_Event_Num = 0;

let Name_Input_Mode = 0

//也是软件发过来的事件 /* 插件触发的事件 */  
$SD.on('sendToPropertyInspector', e => {
    console.log(e);
    let { event, payload } = e
    /* 插件设置数据后触发 */
    if (event === 'sendToPropertyInspector') {
        // choice_VolumeNameItem  =   payload.settings.content.choice_VolumeNameItem 解构赋值

        // if (Last_Key_Time == 0)
        //     $('#Still_Press').checked = false;

        let {
            RecordKeyValue,
            KeyBoardValue,
            MouseValue,
            Reset_Record_Status
            // ,Last_Time
            , Close_Hook,
            Recording_Status,
            Reselect,
            Select_Empty_Config,
            Config_Name_List,
            Delete_This_Select,
            Set_Empty_Config_List,
            Is_Still_Press,
            Already_Record,
            Change_Record_Selected,
            Current_Name,
            Delete_This_Record_Log
        } = e.payload
        console.log("ddd", Change_Record_Selected);
        if (KeyBoardValue) {
            let Return_Value = KeyBoardValue.split('/')
            // if (Return_Value[2] == 1)
            //     $('#Still_Press').checked = false;
            // else if (Return_Value[2] == 3)
            //     $('#Still_Press').checked = true;

            // let This_Record_Status = Record_Status[context] || 0
            // console.log("其次: ", Record_Status);
            // console.log(This_Record_Status);
            // if (
            //     Enum_KeyValue[Return_Value[1]] == $('#RecordKey_Value').innerHTML
            //     && (Return_Value[0] == 0 || Return_Value[0] == 1)
            //     && This_Record_Status % 4 == 0
            // ) {
            //     $('#Record_Log').value = '';
            //     $('#HotKey').innerHTML = '开始录制...';

            //     settings.Record_Log = $('#Record_Log').value;
            //     settings.HotKey = $('#HotKey').innerHTML;
            //     Key_Value_Log = [];
            //     Key_Time_Log = [];
            //     Cursor_Position = [];
            //     settings.Key_Value_Log_Save = Key_Value_Log;
            //     settings.Key_Time_Log_Save = Key_Time_Log;
            //     settings.Cursor_Position_Save = Cursor_Position;
            //     saveData(2);
            //     This_Record_Status++;
            //     Record_Status[context] = This_Record_Status;
            //     localStorage.setItem('Record_Status', JSON.stringify(Record_Status));

            //     Last_Key_Time = Return_Value[2];
            //     // Is_HotKey_Change = 0;

            //     return;
            // }
            // else if (
            //     Enum_KeyValue[Return_Value[1]] == $('#RecordKey_Value').innerHTML
            //     && (Return_Value[0] == 128 || Return_Value[0] == 129)
            //     && This_Record_Status % 4 == 1
            // ) {
            //     // Record_Status++;
            //     // localStorage.setItem('Record_Status', Record_Status);
            //     This_Record_Status++;
            //     Record_Status[context] = This_Record_Status;
            //     localStorage.setItem('Record_Status', JSON.stringify(Record_Status));
            //     return;
            // }
            // else if (
            //     Enum_KeyValue[Return_Value[1]] == $('#RecordKey_Value').innerHTML
            //     && (Return_Value[0] == 0 || Return_Value[0] == 1)
            //     && This_Record_Status % 4 == 2
            // ) {
            //     // clearTimeout(timer_1);
            //     clearInterval(timer_1);
            //     $('#HotKey').innerHTML = '结束录制...';
            //     settings.HotKey = $('#HotKey').innerHTML;
            //     saveData(3);
            //     // Record_Status++;
            //     // localStorage.setItem('Record_Status', Record_Status);
            //     This_Record_Status++;
            //     Record_Status[context] = This_Record_Status;
            //     localStorage.setItem('Record_Status', JSON.stringify(Record_Status));

            //     // Last_Key_Time = Return_Value[2];

            //     return;
            // }
            // else if (
            //     Enum_KeyValue[Return_Value[1]] == $('#RecordKey_Value').innerHTML
            //     && (Return_Value[0] == 128 || Return_Value[0] == 129)
            //     && This_Record_Status % 4 == 3
            // ) {
            //     // Record_Status++;
            //     // Record_Status %= 4;
            //     // localStorage.setItem('Record_Status', Record_Status);
            //     This_Record_Status++;
            //     This_Record_Status %= 4;
            //     Record_Status[context] = This_Record_Status;
            //     localStorage.setItem('Record_Status', JSON.stringify(Record_Status));

            //     // localStorage.setItem('Record_Status',localStorage.getItem('Record_Status') + 2);
            //     // localStorage.clear();
            //     // localStorage.removeItem('Record_Status');

            //     delete Record_Status[context];

            //     localStorage.setItem('Record_Status', JSON.stringify(Record_Status));
            //     return;
            // }
            console.log(KeyBoardValue);

            // if (Record_Status % 4 == 0) {
            //     Record_Status += 2;
            //     Record_Status %= 4;
            //     localStorage.setItem('Record_Status', localStorage.getItem('Record_Status') + 2)
            // }

            //近用纠错本地浏览器缓存记录
            // if (This_Record_Status % 4 == 0) {
            //     This_Record_Status += 2;
            //     This_Record_Status %= 4;
            //     Record_Status[context] = This_Record_Status;
            //     localStorage.setItem('Record_Status', JSON.stringify(Record_Status));
            // }

            //上次按键时间重现
            // if (Last_Key_Time == 0 && Key_Time_Log.length != 0)  //获取时间戳
            // {
            //     Last_Key_Time = Return_Value[2];
            //     // Key_Time_Log.pop();
            //     // Last_Key_Time = Record_Status[context + 'LastTime'];
            // }
            // // Record_Status[context + 'LastTime'] = Return_Value[2];
            // // localStorage.setItem('Record_Status', JSON.stringify(Record_Status));

            // if (Last_Key_Time == 0)
            //     Last_Key_Time = Return_Value[2];

            // if (!$('#Still_Press').checked) {

            //     if (Return_Value[2] == 1 || Return_Value[2] == 3) {
            //         // clearTimeout(timer_1);
            //         clearInterval(timer_1);

            //         $('#Record_Log').value = '';
            //         $('#HotKey').innerHTML = '已改变宏录制配置';

            //         settings.Record_Log = $('#Record_Log').value;
            //         settings.HotKey = $('#HotKey').innerHTML;
            //         Key_Value_Log = [];
            //         Key_Time_Log = [];
            //         Cursor_Position = [];
            //         settings.Key_Value_Log_Save = Key_Value_Log;
            //         settings.Key_Time_Log_Save = Key_Time_Log;
            //         settings.Cursor_Position_Save = Cursor_Position;

            //         // if (Return_Value[2] == 1) {
            //         //     $('#Still_Press').checked.disabled = false;
            //         // }
            //         // else if (Return_Value[2] == 3) {
            //         //     $('#Still_Press').checked.disabled = true;
            //         // }
            //         // $('#Still_Press').disabled = true;
            //     }

            //     Key_Value_Log.push(Return_Value[1]);
            //     settings.Key_Value_Log_Save = Key_Value_Log;
            //     if (Last_Key_Time == 0 || Return_Value[2] == 0 || Return_Value[2] == 1 || Return_Value[2] == 3 || Return_Value[2] == 2) {
            //         // if (Last_Key_Time != 0)
            //         //     settings.Has_Recorded = 1;

            //         // Last_Key_Time = Return_Value[2];
            //         Key_Time_Log.push(Return_Value[3]);
            //         settings.Key_Time_Log_Save = Key_Time_Log;
            //     }
            //     else {

            //         settings.Has_Recorded = 1;
            //         // $('#Still_Press').disabled = true;

            //         Key_Time_Log.push(Return_Value[2] - Last_Key_Time);
            //         // Last_Key_Time = Return_Value[2];
            //         settings.Key_Time_Log_Save = Key_Time_Log;
            //     }

            //     // saveData();    //1

            //     console.log(Key_Time_Log);

            //     if (Return_Value[2] != 1 && Return_Value[2] != 2 && Return_Value[2] != 3) {
            //         // Return_Value.length = 3;
            //         let status = ''
            //         if (Return_Value[0] == 0 || Return_Value[0] == 1)
            //             status = '按下了';
            //         else if (Return_Value[0] == 128 || Return_Value[0] == 129)
            //             status = '抬起了';
            //         $('#HotKey').innerHTML = `${status}  ${Enum_KeyValue[Return_Value[1]]} (${Return_Value[2] - Last_Key_Time}ms)`
            //         HotKey_Current_Value = $('#HotKey').innerHTML;

            //         // clearTimeout(timer_1);
            //         clearInterval(timer_1);

            //         HotKey_Simple_Animation = 0;
            //         timer_1 = setInterval(() => {
            //             if (HotKey_Simple_Animation == 0) {
            //                 $('#HotKey').innerHTML = HotKey_Current_Value + '记录中.';
            //                 HotKey_Simple_Animation++;
            //                 HotKey_Simple_Animation %= 4;
            //             }
            //             else if (HotKey_Simple_Animation == 1) {
            //                 $('#HotKey').innerHTML = HotKey_Current_Value + '记录中..';
            //                 HotKey_Simple_Animation++;
            //                 HotKey_Simple_Animation %= 4;
            //             }
            //             else if (HotKey_Simple_Animation == 2) {
            //                 $('#HotKey').innerHTML = HotKey_Current_Value + '记录中...';
            //                 HotKey_Simple_Animation++;
            //                 HotKey_Simple_Animation %= 4;
            //             }
            //             else if (HotKey_Simple_Animation == 3) {
            //                 $('#HotKey').innerHTML = HotKey_Current_Value + '记录中....';
            //                 HotKey_Simple_Animation++;
            //                 HotKey_Simple_Animation %= 4;
            //             }
            //             settings.HotKey = $('#HotKey').innerHTML;
            //             // saveData();
            //         }, 600)
            //         $('#HotKey').innerHTML = HotKey_Current_Value + '记录中';
            //         settings.HotKey = $('#HotKey').innerHTML;
            //     }

            //     // saveData();  //2
            //     Last_Key_Time = Return_Value[2]

            //     if ($('#Record_Log').value != '')
            //         $('#Record_Log').value += ' + ';
            //     $('#Record_Log').value += Enum_KeyValue[Return_Value[1]]
            //     if (Return_Value[0] == 0 || Return_Value[0] == 1)
            //         $('#Record_Log').value += '↓'
            //     else if (Return_Value[0] == 128 || Return_Value[0] == 129)
            //         $('#Record_Log').value += '↑'
            //     settings.Record_Log = $('#Record_Log').value;
            //     saveData(4);
            // }
            // else if ($('#Still_Press').checked) {

            //     if (Return_Value[2] == 1 || Return_Value[2] == 3) {
            //         // clearTimeout(timer_1);
            //         clearInterval(timer_1);

            //         $('#Record_Log').value = '';
            //         $('#HotKey').innerHTML = '已改变宏录制配置';

            //         settings.Record_Log = $('#Record_Log').value;
            //         settings.HotKey = $('#HotKey').innerHTML;
            //         Key_Value_Log = [];
            //         Key_Time_Log = [];
            //         Cursor_Position = [];
            //         settings.Key_Value_Log_Save = Key_Value_Log;
            //         settings.Key_Time_Log_Save = Key_Time_Log;
            //         settings.Cursor_Position_Save = Cursor_Position;

            //         // $('#Still_Press').disabled = true;
            //     }

            //     Key_Value_Log.push(Return_Value[1]);
            //     settings.Key_Value_Log_Save = Key_Value_Log;
            //     if (Last_Key_Time == 0 || Return_Value[2] == 0 || Return_Value[2] == 1 || Return_Value[2] == 3 || Return_Value[2] == 2) {
            //         // if (Last_Key_Time != 0)
            //         //     settings.Has_Recorded = 1;

            //         // Last_Key_Time = Return_Value[2];
            //         Key_Time_Log.push(Return_Value[3]);
            //         settings.Key_Time_Log_Save = Key_Time_Log;
            //     }
            //     else {

            //         settings.Has_Recorded = 1;
            //         // $('#Still_Press').disabled = true;

            //         Key_Time_Log.push(Return_Value[2] - Last_Key_Time);
            //         // Last_Key_Time = Return_Value[2];
            //         settings.Key_Time_Log_Save = Key_Time_Log;
            //     }

            //     // saveData();    //1

            //     console.log(Key_Time_Log);

            //     if (Return_Value[2] != 1 && Return_Value[2] != 2 && Return_Value[2] != 3) {
            //         // Return_Value.length = 3;
            //         let status = ''
            //         if (Return_Value[0] == 0 || Return_Value[0] == 1)
            //             status = '按下了';
            //         else if (Return_Value[0] == 128 || Return_Value[0] == 129)
            //             status = '抬起了';
            //         $('#HotKey').innerHTML = `${status}  ${Enum_KeyValue[Return_Value[1]]} (${Return_Value[2] - Last_Key_Time}ms)`
            //         HotKey_Current_Value = $('#HotKey').innerHTML;

            //         // clearTimeout(timer_1);
            //         clearInterval(timer_1);

            //         HotKey_Simple_Animation = 0;
            //         timer_1 = setInterval(() => {
            //             if (HotKey_Simple_Animation == 0) {
            //                 $('#HotKey').innerHTML = HotKey_Current_Value + '记录中.';
            //                 HotKey_Simple_Animation++;
            //                 HotKey_Simple_Animation %= 4;
            //             }
            //             else if (HotKey_Simple_Animation == 1) {
            //                 $('#HotKey').innerHTML = HotKey_Current_Value + '记录中..';
            //                 HotKey_Simple_Animation++;
            //                 HotKey_Simple_Animation %= 4;
            //             }
            //             else if (HotKey_Simple_Animation == 2) {
            //                 $('#HotKey').innerHTML = HotKey_Current_Value + '记录中...';
            //                 HotKey_Simple_Animation++;
            //                 HotKey_Simple_Animation %= 4;
            //             }
            //             else if (HotKey_Simple_Animation == 3) {
            //                 $('#HotKey').innerHTML = HotKey_Current_Value + '记录中....';
            //                 HotKey_Simple_Animation++;
            //                 HotKey_Simple_Animation %= 4;
            //             }
            //             settings.HotKey = $('#HotKey').innerHTML;
            //             // saveData();
            //         }, 600)
            //         $('#HotKey').innerHTML = HotKey_Current_Value + '记录中';
            //         settings.HotKey = $('#HotKey').innerHTML;
            //     }

            //     // saveData();  //2
            //     Last_Key_Time = Return_Value[2]

            //     if ($('#Record_Log').value != '')
            //         $('#Record_Log').value += ' + ';
            //     $('#Record_Log').value += Enum_KeyValue[Return_Value[1]]
            //     if (Return_Value[0] == 0 || Return_Value[0] == 1)
            //         $('#Record_Log').value += '↓'
            //     else if (Return_Value[0] == 128 || Return_Value[0] == 129)
            //         $('#Record_Log').value += '↑'
            //     settings.Record_Log = $('#Record_Log').value;
            //     saveData(4);
            // }




            if (Return_Value[2] == 1 || Return_Value[2] == 3) {
                // clearTimeout(timer_1);
                clearInterval(timer_1);

                $('#Record_Log').value = '';
                $('#HotKey').innerHTML = '已改变宏录制配置';

                settings.Record_Log = $('#Record_Log').value;
                settings.HotKey = $('#HotKey').innerHTML;
                Key_Value_Log = [];
                Key_Time_Log = [];
                Cursor_Position = [];
                settings.Key_Value_Log_Save = Key_Value_Log;
                settings.Key_Time_Log_Save = Key_Time_Log;
                settings.Cursor_Position_Save = Cursor_Position;

                // if (Return_Value[2] == 1) {
                //     $('#Still_Press').checked.disabled = false;
                // }
                // else if (Return_Value[2] == 3) {
                //     $('#Still_Press').checked.disabled = true;
                // }
                // $('#Still_Press').disabled = true;
            }

            Key_Value_Log.push(Return_Value[1]);
            settings.Key_Value_Log_Save = Key_Value_Log;
            if (Last_Key_Time == 0 || Return_Value[2] == 0 || Return_Value[2] == 1 || Return_Value[2] == 3 || Return_Value[2] == 2) {
                // if (Last_Key_Time != 0)
                //     settings.Has_Recorded = 1;

                // Last_Key_Time = Return_Value[2];
                Key_Time_Log.push(Return_Value[3]);
                settings.Key_Time_Log_Save = Key_Time_Log;
            }
            else {

                settings.Has_Recorded = 1;
                // $('#Still_Press').disabled = true;

                Key_Time_Log.push(Return_Value[2] - Last_Key_Time);
                // Last_Key_Time = Return_Value[2];
                settings.Key_Time_Log_Save = Key_Time_Log;
            }

            // saveData();    //1

            console.log(Key_Time_Log);

            if (Return_Value[2] != 1 && Return_Value[2] != 2 && Return_Value[2] != 3) {
                // Return_Value.length = 3;
                let status = ''
                if (Return_Value[0] == 0 || Return_Value[0] == 1 || Return_Value[0] == 16 || Return_Value[0] == 32)
                    status = '按下了';
                else if (Return_Value[0] == 128 || Return_Value[0] == 129)
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
            }

            // saveData();  //2
            Last_Key_Time = Return_Value[2]

            if ($('#Record_Log').value != '')
                $('#Record_Log').value += ' + ';
            $('#Record_Log').value += Enum_KeyValue[Return_Value[1]]
            if (Return_Value[0] == 0 || Return_Value[0] == 1 || Return_Value[0] == 16 || Return_Value[0] == 32)
                $('#Record_Log').value += '↓'
            else if (Return_Value[0] == 128 || Return_Value[0] == 129)
                $('#Record_Log').value += '↑'
            settings.Record_Log = $('#Record_Log').value;
            saveData(4);


        }
        else if (MouseValue) {
            let Return_Value = MouseValue.split('/')

            // if (!$('#Still_Press').checked) {
            //     if (Return_Value[3] == 1) {
            //         // clearTimeout(timer_1);
            //         clearInterval(timer_1);

            //         $('#Record_Log').value = '';
            //         $('#HotKey').innerHTML = '已改变宏录制配置';

            //         settings.Record_Log = $('#Record_Log').value;
            //         settings.HotKey = $('#HotKey').innerHTML;
            //         Key_Value_Log = [];
            //         Key_Time_Log = [];
            //         Cursor_Position = [];
            //         settings.Key_Value_Log_Save = Key_Value_Log;
            //         settings.Key_Time_Log_Save = Key_Time_Log;
            //         settings.Cursor_Position_Save = Cursor_Position;
            //     }

            //     Key_Value_Log.push(Return_Value[0]);
            //     settings.Key_Value_Log_Save = Key_Value_Log;

            //     if (Last_Key_Time == 0 || Return_Value[3] == 0 || Return_Value[3] == 1 || Return_Value[3] == 2) {
            //         // if (Last_Key_Time != 0)
            //         //     settings.Has_Recorded = 1;

            //         // Last_Key_Time = Return_Value[3];
            //         Key_Time_Log.push(Return_Value[4]);
            //         settings.Key_Time_Log_Save = Key_Time_Log;
            //     }
            //     else {

            //         settings.Has_Recorded = 1;

            //         Key_Time_Log.push(Return_Value[3] - Last_Key_Time);
            //         // Last_Key_Time = Return_Value[3];
            //         settings.Key_Time_Log_Save = Key_Time_Log;
            //     }

            //     // Key_Time_Log.push(Return_Value[3] - Last_Key_Time);
            //     // settings.Key_Time_Log_Save = Key_Time_Log;

            //     Cursor_Position.push(`(${Return_Value[1]} , ${Return_Value[2]})`);
            //     settings.Cursor_Position_Save = Cursor_Position;
            //     // saveData();  //3

            //     console.log(Key_Time_Log);

            //     // Return_Value.length = 3;

            //     if (Return_Value[3] != 1 && Return_Value[3] != 2) {
            //         $('#HotKey').innerHTML = `${Enum_KeyValue[Return_Value[0]]} ${Return_Value[1]} , ${Return_Value[2]} (${Return_Value[3] - Last_Key_Time}ms)`
            //         HotKey_Current_Value = $('#HotKey').innerHTML;
            //         // clearTimeout(timer_1);
            //         clearInterval(timer_1);
            //         HotKey_Simple_Animation = 0;
            //         timer_1 = setInterval(() => {
            //             if (HotKey_Simple_Animation == 0) {
            //                 $('#HotKey').innerHTML = HotKey_Current_Value + '记录中.';
            //                 HotKey_Simple_Animation++;
            //                 HotKey_Simple_Animation %= 4;
            //             }
            //             else if (HotKey_Simple_Animation == 1) {
            //                 $('#HotKey').innerHTML = HotKey_Current_Value + '记录中..';
            //                 HotKey_Simple_Animation++;
            //                 HotKey_Simple_Animation %= 4;
            //             }
            //             else if (HotKey_Simple_Animation == 2) {
            //                 $('#HotKey').innerHTML = HotKey_Current_Value + '记录中...';
            //                 HotKey_Simple_Animation++;
            //                 HotKey_Simple_Animation %= 4;
            //             }
            //             else if (HotKey_Simple_Animation == 3) {
            //                 $('#HotKey').innerHTML = HotKey_Current_Value + '记录中....';
            //                 HotKey_Simple_Animation++;
            //                 HotKey_Simple_Animation %= 4;
            //             }
            //             settings.HotKey = $('#HotKey').innerHTML;
            //             // saveData();
            //         }, 600)
            //         $('#HotKey').innerHTML = HotKey_Current_Value + '记录中';
            //         settings.HotKey = $('#HotKey').innerHTML;
            //     }

            //     // saveData();  //4
            //     Last_Key_Time = Return_Value[3]

            //     if (Return_Value[0] != 512) {
            //         if ($('#Record_Log').value != '')
            //             $('#Record_Log').value += ' + ';
            //         $('#Record_Log').value += Enum_KeyValue[Return_Value[0]]
            //         console.log(11);
            //         // if (Return_Value[0] == 0 || Return_Value[0] == 1)
            //         //     $('#Record_Log').value += '↓'
            //         // else if (Return_Value[0] == 128 || Return_Value[0] == 129)
            //         //     $('#Record_Log').value += '↑'
            //         settings.Record_Log = $('#Record_Log').value;
            //     }


            //     saveData(5);
            // }
            // else if ($('#Still_Press').checked) {
            //     if (Return_Value[3] == 1) {
            //         // clearTimeout(timer_1);
            //         clearInterval(timer_1);

            //         $('#Record_Log').value = '';
            //         $('#HotKey').innerHTML = '已改变宏录制配置';

            //         settings.Record_Log = $('#Record_Log').value;
            //         settings.HotKey = $('#HotKey').innerHTML;
            //         Key_Value_Log = [];
            //         Key_Time_Log = [];
            //         Cursor_Position = [];
            //         settings.Key_Value_Log_Save = Key_Value_Log;
            //         settings.Key_Time_Log_Save = Key_Time_Log;
            //         settings.Cursor_Position_Save = Cursor_Position;
            //     }

            //     Key_Value_Log.push(Return_Value[0]);
            //     settings.Key_Value_Log_Save = Key_Value_Log;

            //     if (Last_Key_Time == 0 || Return_Value[3] == 0 || Return_Value[3] == 1 || Return_Value[3] == 2) {
            //         // if (Last_Key_Time != 0)
            //         //     settings.Has_Recorded = 1;

            //         // Last_Key_Time = Return_Value[3];
            //         Key_Time_Log.push(Return_Value[4]);
            //         settings.Key_Time_Log_Save = Key_Time_Log;
            //     }
            //     else {

            //         settings.Has_Recorded = 1;

            //         Key_Time_Log.push(Return_Value[3] - Last_Key_Time);
            //         // Last_Key_Time = Return_Value[3];
            //         settings.Key_Time_Log_Save = Key_Time_Log;
            //     }

            //     // Key_Time_Log.push(Return_Value[3] - Last_Key_Time);
            //     // settings.Key_Time_Log_Save = Key_Time_Log;

            //     Cursor_Position.push(`(${Return_Value[1]} , ${Return_Value[2]})`);
            //     settings.Cursor_Position_Save = Cursor_Position;
            //     // saveData();  //3

            //     console.log(Key_Time_Log);

            //     // Return_Value.length = 3;

            //     if (Return_Value[3] != 1 && Return_Value[3] != 2) {
            //         $('#HotKey').innerHTML = `${Enum_KeyValue[Return_Value[0]]} ${Return_Value[1]} , ${Return_Value[2]} (${Return_Value[3] - Last_Key_Time}ms)`
            //         HotKey_Current_Value = $('#HotKey').innerHTML;
            //         // clearTimeout(timer_1);
            //         clearInterval(timer_1);
            //         HotKey_Simple_Animation = 0;
            //         timer_1 = setInterval(() => {
            //             if (HotKey_Simple_Animation == 0) {
            //                 $('#HotKey').innerHTML = HotKey_Current_Value + '记录中.';
            //                 HotKey_Simple_Animation++;
            //                 HotKey_Simple_Animation %= 4;
            //             }
            //             else if (HotKey_Simple_Animation == 1) {
            //                 $('#HotKey').innerHTML = HotKey_Current_Value + '记录中..';
            //                 HotKey_Simple_Animation++;
            //                 HotKey_Simple_Animation %= 4;
            //             }
            //             else if (HotKey_Simple_Animation == 2) {
            //                 $('#HotKey').innerHTML = HotKey_Current_Value + '记录中...';
            //                 HotKey_Simple_Animation++;
            //                 HotKey_Simple_Animation %= 4;
            //             }
            //             else if (HotKey_Simple_Animation == 3) {
            //                 $('#HotKey').innerHTML = HotKey_Current_Value + '记录中....';
            //                 HotKey_Simple_Animation++;
            //                 HotKey_Simple_Animation %= 4;
            //             }
            //             settings.HotKey = $('#HotKey').innerHTML;
            //             // saveData();
            //         }, 600)
            //         $('#HotKey').innerHTML = HotKey_Current_Value + '记录中';
            //         settings.HotKey = $('#HotKey').innerHTML;
            //     }

            //     // saveData();  //4
            //     Last_Key_Time = Return_Value[3]

            //     if (Return_Value[0] != 512) {
            //         if ($('#Record_Log').value != '')
            //             $('#Record_Log').value += ' + ';
            //         $('#Record_Log').value += Enum_KeyValue[Return_Value[0]]
            //         console.log(11);
            //         // if (Return_Value[0] == 0 || Return_Value[0] == 1)
            //         //     $('#Record_Log').value += '↓'
            //         // else if (Return_Value[0] == 128 || Return_Value[0] == 129)
            //         //     $('#Record_Log').value += '↑'
            //         settings.Record_Log = $('#Record_Log').value;
            //     }

            //     saveData(5);
            // }


            if (Return_Value[3] == 1) {
                // clearTimeout(timer_1);
                clearInterval(timer_1);

                $('#Record_Log').value = '';
                $('#HotKey').innerHTML = '已改变宏录制配置';

                settings.Record_Log = $('#Record_Log').value;
                settings.HotKey = $('#HotKey').innerHTML;
                Key_Value_Log = [];
                Key_Time_Log = [];
                Cursor_Position = [];
                settings.Key_Value_Log_Save = Key_Value_Log;
                settings.Key_Time_Log_Save = Key_Time_Log;
                settings.Cursor_Position_Save = Cursor_Position;
            }

            Key_Value_Log.push(Return_Value[0]);
            settings.Key_Value_Log_Save = Key_Value_Log;

            if (Last_Key_Time == 0 || Return_Value[3] == 0 || Return_Value[3] == 1 || Return_Value[3] == 2) {
                // if (Last_Key_Time != 0)
                //     settings.Has_Recorded = 1;

                // Last_Key_Time = Return_Value[3];
                Key_Time_Log.push(Return_Value[4]);
                settings.Key_Time_Log_Save = Key_Time_Log;
            }
            else {

                settings.Has_Recorded = 1;

                Key_Time_Log.push(Return_Value[3] - Last_Key_Time);
                // Last_Key_Time = Return_Value[3];
                settings.Key_Time_Log_Save = Key_Time_Log;
            }

            // Key_Time_Log.push(Return_Value[3] - Last_Key_Time);
            // settings.Key_Time_Log_Save = Key_Time_Log;

            Cursor_Position.push(`(${Return_Value[1]} , ${Return_Value[2]})`);
            settings.Cursor_Position_Save = Cursor_Position;
            // saveData();  //3

            console.log(Key_Time_Log);

            // Return_Value.length = 3;

            if (Return_Value[3] != 1 && Return_Value[3] != 2) {
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
            }

            // saveData();  //4
            Last_Key_Time = Return_Value[3]

            if (Return_Value[0] != 512) {
                if ($('#Record_Log').value != '')
                    $('#Record_Log').value += ' + ';
                $('#Record_Log').value += Enum_KeyValue[Return_Value[0]]
                console.log(11);
                // if (Return_Value[0] == 0 || Return_Value[0] == 1)
                //     $('#Record_Log').value += '↓'
                // else if (Return_Value[0] == 128 || Return_Value[0] == 129)
                //     $('#Record_Log').value += '↑'
                settings.Record_Log = $('#Record_Log').value;
            }

            saveData(5);


            // console.log(1);
            // console.log($('#Record_Log').value);
        }
        // else if (Reset_Record_Status) {

        //     Record_Status[context] = 0;
        //     localStorage.setItem('Record_Status', JSON.stringify(Record_Status));
        //     $('#HotKey').innerHTML = '结束录制';
        //     // settings.HotKey = $('#HotKey').innerHTML;
        //     settings.HotKey = '结束录制';

        //     // clearTimeout(timer_1);
        //     clearInterval(timer_1);
        //     saveData(6);

        // }
        // else if (e.payload.Last_Time) {
        //     Last_Key_Time = e.payload.Last_Time;
        //     // Is_HotKey_Change++;
        // }
        // else if (Close_Hook) {

        //     Record_Status[context] = 0;
        //     localStorage.setItem('Record_Status', JSON.stringify(Record_Status));

        //     $('#HotKey').innerHTML = '休眠中(点此按钮或插件恢复)';
        //     settings.HotKey = $('#HotKey').innerHTML;

        //     // clearTimeout(timer_1);
        //     clearInterval(timer_1);
        //     saveData(7);

        // }
        else if (Recording_Status) {    // 获取选中的录制插件的热键记录，当按下回访时，这里更新热键记录
            if (Recording_Status == "Start") {
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
                // This_Record_Status++;
                // Record_Status[context] = This_Record_Status;
                // localStorage.setItem('Record_Status', JSON.stringify(Record_Status));


                // Last_Key_Time = Return_Value[2];
                // Is_HotKey_Change = 0;

                return;
            }
            else if (Recording_Status == "Stop") {
                // clearTimeout(timer_1);
                clearInterval(timer_1);
                $('#HotKey').innerHTML = '结束录制...';
                settings.HotKey = $('#HotKey').innerHTML;
                saveData(3);
                // // Record_Status++;
                // // localStorage.setItem('Record_Status', Record_Status);
                // This_Record_Status++;
                // Record_Status[context] = This_Record_Status;
                // localStorage.setItem('Record_Status', JSON.stringify(Record_Status));

                // Last_Key_Time = Return_Value[2];

                return;
            }


        }
        else if (Reselect) {

        }
        else if (Select_Empty_Config) {

            $('#Record_Log').value = '';
            $('#HotKey').innerHTML = '该宏录制配置未录制';

            settings.Record_Log = $('#Record_Log').value;
            settings.HotKey = $('#HotKey').innerHTML;
            Key_Value_Log = [];
            Key_Time_Log = [];
            Cursor_Position = [];
            settings.Key_Value_Log_Save = Key_Value_Log;
            settings.Key_Time_Log_Save = Key_Time_Log;
            settings.Cursor_Position_Save = Cursor_Position;


        }
        else if (Config_Name_List) {

            // console.log(Config_Name_List);

            // let html = ''
            // DriveNames.forEach((item, i) => {
            //     html += `<option value="${i}">${item} (${VolumeName[i]})</option>`
            // });

            // settings.config = [];
            let config = [];
            Config_Name_List.forEach((item, i) => {
                // html += `<option value="${item}">${item}</option>`
                // settings.config.push(item);
                config.push(item)
                // console.log(item);
            })
            // $('#myselect').innerHTML = html;
            settings.config = config;
            // console.log(settings.config);

            $('#myselect').innerHTML = settings.config.map((item, i, arr) => {
                return `<option value="${item}">${item}</option>`
            }).join('\n');

            $('#myselect').value = settings.Record_Current_Value || settings.config[0];

            saveData();
        }
        else if (Delete_This_Select) {
            settings.config = settings.config?.filter(item => item != $('#myselect').value)
            console.log(settings.config);
            // saveData();

            let count = 0;
            //方法四
            Array.from($('#myselect').children).forEach(item => {
                if ($('#myselect').value == item.value && count == 0) {
                    item.remove();
                    count++;
                }
                // if (item.value == "config3")
                //     item.remove();
            })

            settings.Record_Current_Value = settings.config[0];
            $('#myselect').value = settings.Record_Current_Value || settings.config[0];
            saveData();

        }
        else if (Set_Empty_Config_List) {
            // if(Set_Empty_Config_List == 1)
            // {
            //     Empty_Config_List = true;
            // }
            // Empty_Config_List = true;
            // settings.Record_Current_Value = '';
        }
        else if (Is_Still_Press == true || Is_Still_Press == false) {
            //start
            // let Key_Is_Down = e.payload.Key_Is_Down[][]
            $('#Record_Log').value = '';
            // $('#HotKey').innerHTML = '开始录制...';

            // settings.Record_Log = $('#Record_Log').value;
            // settings.HotKey = $('#HotKey').innerHTML;
            Key_Value_Log = [];
            Key_Time_Log = [];
            Cursor_Position = [];
            settings.Key_Value_Log_Save = Key_Value_Log;
            settings.Key_Time_Log_Save = Key_Time_Log;
            settings.Cursor_Position_Save = Cursor_Position;
            // saveData(2);

            KeyData_Event_Num = 0;
            Mouse_Event_Num = 0;
            Current_Event_Num = 0;
            Mouse_Wheel_Num = 0;

            $('#Still_Press').checked = Is_Still_Press;
            settings.Still_Press = $('#Still_Press').checked;

            e.payload.Key_Value_Vector.forEach((item, i) => {
                if (item >= 0 && item < 256) {

                    if (e.payload.Key_Time_Vector[i] < 0)
                        $('#Record_Log').value += " 键盘 " + Enum_KeyValue[item] + "键 " + "执行 " + (-e.payload.Key_Time_Vector[i]) + "次\n";
                    else if (e.payload.Key_Time_Vector[i] >= 0) {
                        if (e.payload.KeyData_Event_Num[KeyData_Event_Num] == 1) {
                            $('#Record_Log').value += " 延迟 \"" + e.payload.Key_Time_Vector[i] + "\"ms" + "  按下" + "  \"" + Enum_KeyValue[item] + "\"\n";

                        }
                        else if (e.payload.KeyData_Event_Num[KeyData_Event_Num] == 0) {
                            $('#Record_Log').value += " 延迟 \"" + e.payload.Key_Time_Vector[i] + "\"ms" + "  弹起" + "  \"" + Enum_KeyValue[item] + "\"\n";
                        }
                        KeyData_Event_Num++;

                    }

                }
                else if (item >= 256) {

                    if (e.payload.Key_Time_Vector[i] < 0) {
                        if (item == 513)
                            $('#Record_Log').value += ' 鼠标左键' + '(' + e.payload.Key_Mouse_Position[Mouse_Event_Num][0] + ',' + e.payload.Key_Mouse_Position[Mouse_Event_Num][1] + ')' + ' 执行 ' + (-e.payload.Key_Time_Vector[i]) + '次\n';
                        else if (item == 516)
                            $('#Record_Log').value += ' 鼠标右键' + '(' + e.payload.Key_Mouse_Position[Mouse_Event_Num][0] + ',' + e.payload.Key_Mouse_Position[Mouse_Event_Num][1] + ')' + ' 执行 ' + (-e.payload.Key_Time_Vector[i]) + '次\n';
                        else if (item == 519)
                            $('#Record_Log').value += ' 鼠标滚轮' + '(' + e.payload.Key_Mouse_Position[Mouse_Event_Num][0] + ',' + e.payload.Key_Mouse_Position[Mouse_Event_Num][1] + ')' + ' 点击 ' + (-e.payload.Key_Time_Vector[i]) + '次\n';
                        else if (item == 522) {
                            if (e.payload.KeyData_Event_Num[KeyData_Event_Num] == 0x780000)
                                $('#Record_Log').value += ' 鼠标滚轮' + '(' + e.payload.Key_Mouse_Position[Mouse_Event_Num][0] + ',' + e.payload.Key_Mouse_Position[Mouse_Event_Num][1] + ')' + ' 前滚 ' + (-e.payload.Key_Time_Vector[i]) + '次\n';
                            else if (e.payload.KeyData_Event_Num[KeyData_Event_Num] == 0xFF880000) {
                                $('#Record_Log').value += ' 鼠标滚轮' + '(' + e.payload.Key_Mouse_Position[Mouse_Event_Num][0] + ',' + e.payload.Key_Mouse_Position[Mouse_Event_Num][1] + ')' + ' 后滚 ' + (-e.payload.Key_Time_Vector[i]) + '次\n';
                            }
                            KeyData_Event_Num++;

                        } else if (item == 523) {
                            $('#Record_Log').value += ' 鼠标侧键'
                                + e.payload.KeyData_Event_Num[KeyData_Event_Num] / 16 / 16 / 16 / 16
                                + '(' + e.payload.Key_Mouse_Position[Mouse_Event_Num][0] + ',' + e.payload.Key_Mouse_Position[Mouse_Event_Num][1] + ')'
                                + ' 执行 ' + (-e.payload.Key_Time_Vector[i]) + '次\n';
                            KeyData_Event_Num
                        }

                    }
                    else if (e.payload.Key_Time_Vector[i] >= 0) {
                        if (item == 522 && e.payload.KeyData_Event_Num[KeyData_Event_Num] == 0x780000) {
                            $('#Record_Log').value += " 延迟 \"" + e.payload.Key_Time_Vector[i] + "\"ms" + " "
                                + /*Enum_KeyValue[item]*/"滚轮向前" + "(" + e.payload.Key_Mouse_Position[Mouse_Event_Num][0] + ","
                                + e.payload.Key_Mouse_Position[Mouse_Event_Num][1] + ")" + "\n";
                            // Mouse_Wheel_Num++;
                            KeyData_Event_Num++;
                        }
                        else if (item == 522 && e.payload.KeyData_Event_Num[KeyData_Event_Num] == 0xFF880000) {
                            $('#Record_Log').value += " 延迟 \"" + e.payload.Key_Time_Vector[i] + "\"ms" + " "
                                + /*Enum_KeyValue[item]*/"滚轮向后" + "(" + e.payload.Key_Mouse_Position[Mouse_Event_Num][0] + ","
                                + e.payload.Key_Mouse_Position[Mouse_Event_Num][1] + ")" + "\n";
                            // Mouse_Wheel_Num++;
                            KeyData_Event_Num++;
                        }
                        else if (item == 523 || item == 524) {
                            let XButton_Num = e.payload.KeyData_Event_Num[KeyData_Event_Num] / 16 / 16 / 16 / 16;
                            // JSON.stringify
                            // let abc = XButton_Num + '';
                            // let string = String(XButton_Num);
                            $('#Record_Log').value += " 延迟 \"" + e.payload.Key_Time_Vector[i] + "\"ms" + " "
                                + Enum_KeyValue[item]
                                + XButton_Num
                                + "(" + e.payload.Key_Mouse_Position[Mouse_Event_Num][0] + ","
                                + e.payload.Key_Mouse_Position[Mouse_Event_Num][1] + ")" + "\n";
                            KeyData_Event_Num++;
                        }
                        else if (item != 522 && item != 523 && item != 524)
                            $('#Record_Log').value += " 延迟 \"" + e.payload.Key_Time_Vector[i] + "\"ms" + " " + Enum_KeyValue[item] + "(" + e.payload.Key_Mouse_Position[Mouse_Event_Num][0] + "," + e.payload.Key_Mouse_Position[Mouse_Event_Num][1] + ")" + "\n";

                        // Mouse_Event_Num++;
                    }
                    Mouse_Event_Num++;
                }
                else if (item < 0) {
                    $('#Record_Log').value += " 延时 " + e.payload.Key_Time_Vector[i] + " ms\n";
                }

            });
            //end


            // e.payload.Key_Value_Vector.forEach((item, i) => {
            //     if (item < 256) {

            //         if (e.payload.KeyData_Event_Num[KeyData_Event_Num]) {
            //             $('#Record_Log').value += " 延迟 \"" + e.payload.Key_Time_Vector[i] + "\"ms" + "  按下" + "  \"" + Enum_KeyValue[item] + "\"\n";

            //         }
            //         else if (!e.payload.KeyData_Event_Num[KeyData_Event_Num]) {
            //             $('#Record_Log').value += " 延迟 \"" + e.payload.Key_Time_Vector[i] + "\"ms" + "  弹起" + "  \"" + Enum_KeyValue[item] + "\"\n";
            //         }
            //         KeyData_Event_Num++;

            //     }
            //     else if (item > 256) {
            //         $('#Record_Log').value += " 延迟 \"" + e.payload.Key_Time_Vector[i] + "\"ms" + " " + Enum_KeyValue[item] + "(" + e.payload.Key_Mouse_Position[Mouse_Event_Num][0] + "," + e.payload.Key_Mouse_Position[Mouse_Event_Num][1] + ")" + "\n";
            //         Mouse_Event_Num++;
            //     }

            // });



            // $SD.api.sendToPlugin(uuid, action, {
            //     Record_Log_Changed: $('#Record_Log').value
            // })

            settings.Record_Log = $('#Record_Log').value;
            settings.HotKey = $('#HotKey').innerHTML;
            saveData();
        }
        else if (Already_Record == true || Already_Record == false) {
            $('#Still_Press').disabled = Already_Record;
            settings.Already_Record = Already_Record;
            saveData();

        }
        else if (Change_Record_Selected) {
            $('#myselect').value = Change_Record_Selected;
            settings.Record_Current_Value = Change_Record_Selected;
            saveData();

        }
        else if (Current_Name) {
            settings.Record_Current_Value = Current_Name;
            saveData();
        }
        console.log("Delete_This_Record_Log", Delete_This_Record_Log);
        if (Delete_This_Record_Log == 1) {
            // 删除relog
            settings.Record_Log = '';
            saveData();
            console.log('xxx','删除ssssssssssss');
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
            Cursor_Position_Save,
            // MySelect_Save,
            Record_Current_Value,
            Has_Recorded,
            Delete_Delay,
            Still_Press,
            Mouse_track,
            Already_Record,
            Relative_coordinates
        } = settings    // choice_VolumeNameItem  =   payload.settings.content.choice_VolumeNameItem 解构赋值

        Has_Recorded = Has_Recorded || 0;
        // if (Has_Recorded == 0) {
        //     $('#Still_Press').disabled = false;
        // }
        // else if (Has_Recorded == 1) {
        //     $('#Still_Press').disabled = true;
        // }
        // $('#RecordKey_Value').innerHTML = Enum_KeyValue[RecordKeyValue_Save] || '请输入录制键'

        //近用 本地浏览器缓存 持久化
        // let This_Record_Status = localStorage.getItem('Record_Status') || '{}'
        // This_Record_Status = JSON.parse(This_Record_Status)

        // if(Is_HotKey_Change == 0)
        // if (This_Record_Status[context] != 0)

        $('#HotKey').innerHTML = HotKey || '按键开始录制'

        $('#Record_Log').value = Record_Log || ''
        Key_Value_Log = Key_Value_Log_Save || []
        Key_Time_Log = Key_Time_Log_Save || []
        Cursor_Position = Cursor_Position_Save || []

        settings.config = settings.config || [];
        // || [
        //     "宏录制1",
        //     "宏录制2",
        //     '宏录制3'
        // ];
        console.log(settings.config);

        if (Empty_Config_List) {
            settings.config = [];
            // Empty_Config_List=false;
        }
        // console.log(MySelect_Save);
        // $('#myselect').innerHTML = Array.from($('#myselect').children).map(item => item.innerHTML).join('');
        $('#myselect').innerHTML = settings.config?.map((item, i, arr) => {
            return `<option value="${item}">${item}</option>`
        }).join('\n');

        // let html = '';
        // config.forEach((item) => {
        //     html += `<option value="${item}">${item}</option>`
        // });
        // $('#myselect').innerHTML = html;

        $('#myselect').value = Record_Current_Value || settings.config[0];

        $('#Delete_Delay').checked = Delete_Delay;
        $('#Still_Press').checked = Still_Press;
        $('#Mouse_track').checked = Mouse_track;
        $('#Still_Press').disabled = Already_Record;
        $('#Relative_coordinates').checked = Relative_coordinates;

    }
})


/* 保存数据 */
function saveData(x) {
    $SD.api.setSettings(context, settings)
    console.log(x);
}

function SetRecordKey() {
    $SD.api.sendToPlugin(uuid, action, {
        Set_RecordKey: 'Set_RecordKey'
    })
    // window.prompt()
}

function Restore_Hook() {

    // clearTimeout(timer_1);
    clearInterval(timer_1);

    $SD.api.sendToPlugin(uuid, action, {
        Restore_Hook: 'Restore_Hook'
    })
    $('#HotKey').innerHTML = '插件已恢复';
    settings.HotKey = $('#HotKey').innerHTML;
    saveData(8);
    // let Return = window.prompt("请输入名称","默认配置");
    // alert(11)
}

// function Restore_Hook() {

//     $('#Still_Press').disabled = true;


// }

function Add_Config() {

    // let name = window.prompt();
    // // settings.name = name;
    // if (name != null)
    //     $('#myselect').innerHTML += `<option value="${name}">${name}</option>`
    // // display:none.
    // // display:block/flex
    // // $('#myselect').style.display = "none";  

    // // $('#myselect').innerHTML -= `<option value="${name}">${name}</option>`

    // settings.myselect = $('#myselect').innerHTML;
    // saveData();

    Name_Input_Mode = 1;

    $('#HotKey_Status').style.display = "none";
    $('#HotKey_Log').style.display = "none";

    $('#Name_Input').style.display = "flex";
    $('#Name_Button').style.display = "flex";

    $('#Still_Press').checked = false;
}

// const d = ()=>{
//     区别1、this不同(箭头函数没有this)
//     区别2、可以简写
// }

function Delete_Config() {

    // document.querySelector('#ddd')
    // console.dir($('#myselect'));

    $SD.api.sendToPlugin(uuid, action, {
        Delete_Config: $('#myselect').value
    });

    Last_Key_Time = 0;


    // every
    // some
    // for(let i = 0 ; i < 10 ; i++)
    // {

    // }

    // let i = 0;
    // while ( i < 10)
    // {
    //     i++;

    //     continue;
    //     break;

    // }

    // 方法一
    // const myselect = $('#myselect')
    // $('#myselect').children[$('#myselect').selectedIndex].remove()

    // 方法二
    // const arr = Array.from($('#myselect').children).filter(item => !(item.value == "config3"))
    // $('#myselect').innerHTML = arr.map(item => item.outerHTML).join('')
    // console.log($('#myselect').innerHTML);

    // 方法三
    // Array.from($('#myselect').children).filter(item => {
    //     // if ($('#myselect').value == item.value)
    //     //     item.remove();
    //     if (item.value == "config3")
    //         item.remove();
    //     // return  1;
    // })


    // 注释
    // settings.MySelect_Save = $('#myselect').value;
    // console.log($('#myselect'));
    // saveData();

    // settings.config = settings.config || [];

    settings.config = settings.config?.filter(item => item != $('#myselect').value)
    console.log(settings.config);
    settings.Record_Current_Value = settings.config[0];
    saveData();

    let count = 0;
    //方法四
    Array.from($('#myselect').children).forEach(item => {
        if ($('#myselect').value == item.value && count == 0) {
            item.remove();
            count++;
        }
        // if (item.value == "config3")
        //     item.remove();
    })

    // Array.from($('#myselect').children).every(item => {
    //     if ($('#myselect').value == item.value) {
    //         item.remove();
    //         return false
    //     }
    //     return true // return undefine
    //     // if (item.value == "config3")
    //     //     item.remove();
    // })

    // Array.from($('#myselect').children).some(item => {
    //     if ($('#myselect').value == item.value) {
    //         item.remove();
    //         return true
    //     }
    //     return false // return undefine
    //     // if (item.value == "config3")
    //     //     item.remove();
    // })

    $('#Still_Press').checked = false;

}


function OK_Button_Click() {

    let Is_Name_Exist = false
    Array.from($('#myselect').children).forEach((item, i) => {
        if (item.value == $('#This_Name_Input').value) {
            Is_Name_Exist = true;
            $SD.api.sendToPlugin(uuid, action, {
                Rename_Config: $('#myselect').value + '/' + $('#This_Name_Input').value
            });
        }
    })

    if ($('#This_Name_Input').value != "" && Name_Input_Mode == 1 && !Is_Name_Exist) {
        $('#myselect').innerHTML += `<option value="${$('#This_Name_Input').value}">${$('#This_Name_Input').value}</option>`;
        // settings.MySelect_Save = $('#myselect');
        //只有map映射才会有return,foreach只是正常循环
        settings.config = Array.from($('#myselect').children).map((item, i, arr) => {
            return item.value;
        });
        // settings.config = Array.from($('#myselect').children.value);

        // settings.config.push($('#This_Name_Input').value);

        $('#myselect').value = $('#This_Name_Input').value;
        settings.Record_Current_Value = $('#This_Name_Input').value;

        saveData();
        $SD.api.sendToPlugin(uuid, action, {
            Add_Config: $('#This_Name_Input').value
        });
    }

    // $('#myselect').innerHTML = settings.config.map((item, i, arr) => {
    //     return `<option value="${item}">${item}</option>`
    // }).join('\n');

    // $('#myselect').value = settings.Record_Current_Value || settings.config[0];

    // saveData();

    if ($('#This_Name_Input').value != "" && Name_Input_Mode == 2 && !Is_Name_Exist) {
        // $('#myselect').innerHTML += `<option value="${$('#This_Name_Input').value}">${$('#This_Name_Input').value}</option>`;

        Array.from($('#myselect').children).forEach((item, i) => {
            if (item.value == $('#This_Name_Input').value)
                $SD.api.sendToPlugin(uuid, action, {
                    Rename_Config: Old_Name + '/' + $('#This_Name_Input').value
                });
            return;
        })

        let Old_Name = $('#myselect').value;
        console.dir($('#myselect').children);

        $('#myselect').innerHTML = Array.from($('#myselect').children).map((item, i, arr) => {
            if (item.value != Old_Name)
                // return `<option value="${item.value}">${item.value}</option>`
                return item.outerHTML
            else if (item.value == Old_Name)
                return `<option value="${$('#This_Name_Input').value}">${$('#This_Name_Input').value}</option>`
        }).join('\n');

        //只有map映射才会有return,foreach只是正常循环
        settings.config = Array.from($('#myselect').children).map((item, i, arr) => {
            return item.value;
        });

        $('#myselect').value = $('#This_Name_Input').value;
        settings.Record_Current_Value = $('#This_Name_Input').value;
        saveData();
        $SD.api.sendToPlugin(uuid, action, {
            Rename_Config: Old_Name + '/' + $('#This_Name_Input').value
        });


    }


    $('#HotKey_Status').style.display = "flex";
    $('#HotKey_Log').style.display = "flex";

    $('#Name_Input').style.display = "none";
    $('#Name_Button').style.display = "none";

    $('#Record_Log').value = '';

    Name_Input_Mode = 0;

    console.log($('#Record_Log').value);

}

// function OK_Button_Click() {
//     if ($('#This_Name_Input').value != "") {
//         $('#myselect').innerHTML += `<option value="${$('#This_Name_Input').value}">${$('#This_Name_Input').value}</option>`;
//         // settings.MySelect_Save = $('#myselect');
//         //只有map映射才会有return,foreach只是正常循环
//         settings.config = Array.from($('#myselect').children).map((item, i, arr) => {
//             return item.value;
//         });
//         // settings.config = Array.from($('#myselect').children.value);

//         // settings.config.push($('#This_Name_Input').value);

//         $('#myselect').value = $('#This_Name_Input').value;
//         settings.Record_Current_Value = $('#This_Name_Input').value;

//         saveData();
//         $SD.api.sendToPlugin(uuid, action, {
//             Add_Config: $('#This_Name_Input').value
//         });
//     }


//     $('#HotKey_Status').style.display = "flex";
//     $('#HotKey_Log').style.display = "flex";

//     $('#Name_Input').style.display = "none";
//     $('#Name_Button').style.display = "none";

//     $('#Record_Log').value = '';

// }

function Cancel_Button_Click() {

    $('#HotKey_Status').style.display = "flex";
    $('#HotKey_Log').style.display = "flex";

    $('#Name_Input').style.display = "none";
    $('#Name_Button').style.display = "none";


}
// window.prompt()

function Change_Record_Log() {

    settings.Record_Current_Value = $('#myselect').value;

    console.log(settings.Record_Current_Value);

    $SD.api.sendToPlugin(uuid, action, {
        Change_Select: $('#myselect').value,
        Already_Record: settings.Already_Record
    });
    // console.dir($('#myselect'));
    $('#Still_Press').checked = false;

    $('#HotKey').innerHTML = "宏录制已改变...";
    settings.HotKey = $('#HotKey').innerHTML;
    saveData(12);

}

// let Chen_Shao = 0;

function sleep(time) {
    return new Promise((reject, resolve) => {
        setTimeout(() => {
            resolve()
        }, time);
    })
}

function Load_Config() {
    $('#Load_Config_input').click();




    // $SD.api.sendToPlugin(uuid, action, {
    //     Load_Config_List: File_Path
    // });

    // File_Path = "";

}


$("#Load_Config_input").addEventListener('change', function () {

    // console.log("111", File_Path);

    // $SD.api.sendToPlugin(uuid, action, {
    //     Load_Config_List: File_Path
    // });
    // Chen_Shao = 1;

})

function Is_Delete_Delay() {
    settings.Delete_Delay = $('#Delete_Delay').checked;
    saveData();
    // console.log($('#Delete_Delay').value, e);
    $SD.api.sendToPlugin(uuid, action, {
        Delete_Delay: $('#Delete_Delay').checked
    })
}

function Is_Still_Press() {
    settings.Still_Press = $('#Still_Press').checked;
    saveData();
    // console.log($('#Delete_Delay').value, e);
    $SD.api.sendToPlugin(uuid, action, {
        Still_Press: $('#Still_Press').checked
    })
}

function Is_Mouse_track() {
    settings.Mouse_track = $('#Mouse_track').checked;
    saveData();
    // console.log($('#Delete_Delay').value, e);
    $SD.api.sendToPlugin(uuid, action, {
        Mouse_track: $('#Mouse_track').checked
    })
}

//$('#Record_Log').value = Record_Log || ''
let timer_3 = null
function Record_Log_Input() {
    clearTimeout(timer_3)
    timer_3 = setTimeout(() => {
        settings.Record_Log = $('#Record_Log').value;
        saveData();
        $SD.api.sendToPlugin(uuid, action, {
            Record_Log_Changed: $('#Record_Log').value
        })
    }, 1000)
}


function Select_Mouse_Keyboard_Delay() {
    if ($('#Select_Mouse_Keyboard_Delay').value == 'Mouse') {
        $('#Select_Mouse').style.display = "flex";
        $('#Select_KeyBoard').style.display = "none";
        $('#Delay_Number_MS').style.display = "none";

        Array.from(document.querySelectorAll('.Not_Delay')).forEach((item, i) => {
            // console.log(item);
            // console.dir(item);
            item.style.display = "flex";
        })
        // $('.Delay').style.display = "block";
        document.querySelector('.Delay').style.display = "none";

    }
    else if ($('#Select_Mouse_Keyboard_Delay').value == 'KeyBoard') {
        $('#Select_Mouse').style.display = "none";
        $('#Select_KeyBoard').style.display = "flex";
        $('#Delay_Number_MS').style.display = "none";

        Array.from(document.querySelectorAll('.Not_Delay')).forEach((item, i) => {
            // console.log(item);
            // console.dir(item);
            item.style.display = "flex";
        })
        // $('.Delay').style.display = "block";
        document.querySelector('.Delay').style.display = "none";

    }
    else if ($('#Select_Mouse_Keyboard_Delay').value == 'Delay') {
        $('#Select_Mouse').style.display = "none";
        $('#Select_KeyBoard').style.display = "none";
        $('#Delay_Number_MS').style.display = "block";


        Array.from(document.querySelectorAll('.Not_Delay')).forEach((item, i) => {
            // console.log(item);
            // console.dir(item);
            item.style.display = "none";
        })
        // $('.Delay').style.display = "block";
        document.querySelector('.Delay').style.display = "block";
    }


}

function Rename_Config() {
    Name_Input_Mode = 2;
    // $('#Add_Config').click();
    $('#HotKey_Status').style.display = "none";
    $('#HotKey_Log').style.display = "none";

    $('#Name_Input').style.display = "flex";
    $('#Name_Button').style.display = "flex";

}

function Is_Relative_coordinates() {
    settings.Relative_coordinates = $('#Relative_coordinates').checked;
    saveData();
    $SD.api.sendToPlugin(uuid, action, {
        Relative_coordinates: $('#Relative_coordinates').checked
    })
}