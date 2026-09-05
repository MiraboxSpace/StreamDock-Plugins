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

/* 刷新显示 */
// $SD.on('sendToPropertyInspector', e => {
//     console.log(e);

//     if (e.event === 'didReceiveSettings') {
// var state;
// if (typeof e.payload.state === "number") {
//     state = e.payload.state + "";
// } else {
//     state = e.payload.state;
// }
// $('#beckgroundItem').value = state || '0'
// $('.sdpi-wrapper').style.display = 'block'
//     }
//     else if (e.event === 'sendToPropertyInspector') {
//         // console.log(e.payload)
//     }
// })

let dd;
let settings = {}
//也是软件发过来的事件 /* 插件触发的事件 */  
$SD.on('sendToPropertyInspector', e => {
    console.log(e);
    let { event, payload } = e
    /* 插件设置数据后触发 */
    if (event === 'sendToPropertyInspector') {
        // choice_VolumeNameItem  =   payload.settings.content.choice_VolumeNameItem 解构赋值
        let {
            DriveNames,
            VolumeName
        } = e.payload
        let html = ''
        DriveNames.forEach((item, i) => {
            html += `<option value="${i}">${item} (${VolumeName[i]})</option>`
        });
        $('#VolumeNameItem').innerHTML = html
        $('#VolumeNameItem').value = dd
    }


    if (event === 'didReceiveSettings') {
        var state;
        if (typeof e.payload.state === "number") {
            state = e.payload.state + "";
        } else {
            state = e.payload.state;
        }
        $('#beckgroundItem').value = state || '0'
        $('.sdpi-wrapper').style.display = 'block'


        settings = payload.settings
        let {
            ModeItem,
            choice_VolumeNameItem,
            Switch_Frequency,
            text_Low_Threshold,
            text_Critical_Threshold,
            color_Low_Threshold,
            color_Critical_Threshold,
            ShowVolumeName,
            Invert_PrograssBar,
            ImageBase64Code
        } = settings    // choice_VolumeNameItem  =   payload.settings.content.choice_VolumeNameItem 解构赋值

        if (!dd) dd = choice_VolumeNameItem || '0'

        $('#ModeItem').value = ModeItem || 'Single_Disk'
        Switch_Mode();
        // $('#VolumeNameItem').value = choice_VolumeNameItem || 0
        $('#Switch_Frequency').value = Switch_Frequency || 5
        $('#Switch_Frequency_Value').innerHTML = Switch_Frequency || 5

        $('#Low_ThresholdItem').value = text_Low_Threshold || '20' //覆盖 引用持久化的数据覆盖原本内容  //设置初始值
        $('#Palette_LowThreshold').value = color_Low_Threshold || '#FFFF00'  //设置调色板初始颜色
        $('#Low_ThresholdItem').style.color = $('#Palette_LowThreshold').value  //设置文本初始颜色

        $('#Critical_ThresholdItem').value = text_Critical_Threshold || '10' //覆盖 引用持久化的数据覆盖原本内容
        $('#Palette_CriticalThreshold').value = color_Critical_Threshold || '#FF0000'
        $('#Critical_ThresholdItem').style.color = $('#Palette_CriticalThreshold').value

        $('#ShowVolumeName').checked = ShowVolumeName || false
        $('#Invert_PrograssBar').checked = Invert_PrograssBar || false
        // console.log($('#Critical_ThresholdItem').value);

        // $SD.api.sendToPlugin(uuid, action, {
        //     DoWhat:'initialize',
        //     initialize: payload.settings
        // })

    }
})


/* 保存数据 */
function saveData() {
    $SD.api.setSettings(context, settings)
    // if(x == 1)
    // $SD.api.setSettings(context, settings.choice_VolumeNameItem)
    // if(x == 2)
    // $SD.api.setSettings(context, settings.color_Low_Threshold)
    // if(x == 3)
    // $SD.api.setSettings(context, settings.text_Low_Threshold)
    // if(x == 4)
    // $SD.api.setSettings(context, settings.color_Critical_Threshold)
    // if(x == 5)
    // $SD.api.setSettings(context, settings.text_Critical_Threshold)

}

function Switch_Mode() {
    if ($('#ModeItem').value == 'Single_Disk')  //单个磁盘
    {
        $('#selectVolumeName').style.display = 'flex';//block
        $('#ssss').style.display = 'none';
        // $('#Frequency_Slider').style.display = 'none';
        // $('#Frequency_Slider_Value').style.display = 'none'; 
    }
    else if ($('#ModeItem').value == 'Disk_Loop')  //磁盘循环
    {
        $('#selectVolumeName').style.display = 'none';
        $('#ssss').style.display = 'flex';
        // $('#Frequency_Slider').style.display = 'flex';
        // $('#Frequency_Slider_Value').style.display = 'flex'; 
    }
}

function Select_ModeItem_SaveData() {
    settings.ModeItem = $('#ModeItem').value;
    saveData();
    Switch_Mode();

    $SD.api.sendToPlugin(uuid, action, {
        ModeItem: $('#ModeItem').value
    })
}

function VolumeNameItem_SaveData() {
    settings.choice_VolumeNameItem = $('#VolumeNameItem').value;
    saveData();
    $SD.api.sendToPlugin(uuid, action, {
        VolumeNameItem: $('#VolumeNameItem').value
    })
}

let timer_3 = null
function Switch_Frequency_SaveData() {
    settings.Switch_Frequency = $('#Switch_Frequency').value;
    $('#Switch_Frequency_Value').innerHTML = $('#Switch_Frequency').value;
    /* innerHTML innerTEXT '<p><p>5'*/
    saveData();

    clearTimeout(timer_3)
    timer_3 = setTimeout(() => {  
        $SD.api.sendToPlugin(uuid, action, {
            Switch_Frequency: $('#Switch_Frequency').value
        })
      }, 500)
}

function palette_LowThreshold_Select_LowThreshold_Color() {
    settings.color_Low_Threshold = $('#Palette_LowThreshold').value;
    Select_LowThreshold_Color();
    // console.log(color_Low_Threshold);
    saveData();
    $SD.api.sendToPlugin(uuid, action, {
        Palette_LowThreshold: $('#Palette_LowThreshold').value
    })
}

let timer_1 = null
function Low_ThresholdItem_saveData() {
    clearTimeout(timer_1)
    timer_1 = setTimeout(() => {
        settings.text_Low_Threshold = $('#Low_ThresholdItem').value;
        console.log(settings.text_Low_Threshold);
        saveData();
        $SD.api.sendToPlugin(uuid, action, {
            Low_ThresholdItem: $('#Low_ThresholdItem').value
        })
    }, 500)
}

function palette_CriticalThreshold_Select_CriticalThreshold_Color() {
    settings.color_Critical_Threshold = $('#Palette_CriticalThreshold').value;
    Select_CriticalThreshold_Color();
    saveData();
    $SD.api.sendToPlugin(uuid, action, {
        Palette_CriticalThreshold: $('#Palette_CriticalThreshold').value
    })
}

let timer_2 = null
function Critical_ThresholdItem_saveData() {
    clearTimeout(timer_2)
    timer_2 = setTimeout(() => {
        settings.text_Critical_Threshold = $('#Critical_ThresholdItem').value;
        saveData();
        $SD.api.sendToPlugin(uuid, action, {
            Critical_ThresholdItem: $('#Critical_ThresholdItem').value
        })
    }, 500)

    // settings.text_Critical_Threshold = $('#Critical_ThresholdItem').value;
    // console.log(settings.text_Critical_Threshold);
    // saveData();
    // $SD.api.sendToPlugin(uuid, action, {
    //     Critical_ThresholdItem: $('#Critical_ThresholdItem').value
    // })
}




function Select_LowThreshold_Color() {
    $('#Low_ThresholdItem').style.color = $('#Palette_LowThreshold').value;
    // saveData()
}

// function Select_CriticalThreshold_Color() {
//     console.log($('#Palette_CriticalThreshold').value);
//     $('#Critical_ThresholdItem').style.color = $('#Palette_CriticalThreshold').value;
// }

function GetImage(e) {
    let img = new Image()
    img.src = URL.createObjectURL(e.target.files[0])

    img.onload = function () {
        let canvas = document.createElement("canvas");
        let ctx = canvas.getContext("2d");
        canvas.width = canvas.height = 126;

        /* 绘制背景 */
        ctx.drawImage(this, 0, 0, 126, 126);

        $SD.api.sendToPlugin(uuid, action, {
            Change_BackGround_By_Base64Code: canvas.toDataURL("image/png")
            // event: 'ws泓'
        })
        settings.ImageBase64Code = canvas.toDataURL("image/png")
        
    }


}

function Select_CriticalThreshold_Color() {
    $('#Critical_ThresholdItem').style.color = $('#Palette_CriticalThreshold').value;
    // saveData()
}
// console.log($('#VolumeNameItem'));
$('#VolumeNameItem').addEventListener('change', function () {
    // 全部都被初始化了
    // $SD.api.setSettings(context, {
    //     choice_VolumeNameItem: this.value
    // }) // 保存设置
    // console.log(this.value);
    // console.log(uuid, action);

    $SD.api.sendToPlugin(uuid, action, {
        choice_VolumeNameItem: this.value
    })
})
function Is_ShowVolumeName(e) {
    settings.ShowVolumeName = $('#ShowVolumeName').checked;
    saveData();
    // console.log($('#ShowVolumeName').value, e);
    $SD.api.sendToPlugin(uuid, action, {
        ShowVolumeName: $('#ShowVolumeName').checked
    })
}

function Is_Invert_PrograssBar(){
    settings.Invert_PrograssBar = $('#Invert_PrograssBar').checked;
    saveData();
    $SD.api.sendToPlugin(uuid, action, {
        Invert_PrograssBar: $('#Invert_PrograssBar').checked
    })
}

// $('#Critical_ThresholdItem').addEventListener('input'/* change */, function () {

//     $SD.api.setSettings(context, {
//         text: $('#Critical_ThresholdItem').value,
//         color: $('#Critical_ThresholdItem').value
//     }) // 保存设置
//     // $SD.api.sendToPlugin(uuid, action, {
//     //     text: this.value
//     // })
// })


//
// function saveData() {
//     $SD.api.setSettings(context, {
//         choice_VolumeNameItem: $('#VolumeNameItem').value,
//         text_Low_Threshold: $('#Low_ThresholdItem').value,
//         text_Critical_Threshold: $('#Critical_ThresholdItem').value,
//         color_Low_Threshold: $('#Palette_LowThreshold').value,
//         color_Critical_Threshold: $('#Palette_CriticalThreshold').value

//     }) // 保存设置
// }