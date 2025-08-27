/// <reference path="../utils/common.js" />
/// <reference path="../utils/action.js" />

// $local 是否国际化
// $back 是否自行决定回显时机
// $dom 获取文档元素 - 不是动态的都写在这里面
const $local = true, $back = false, $dom = {
    main: $('.sdpi-wrapper'),
    serverName: $('#serverName'),
    save: $('#save'),
    Launch: $('#Launch'),
    Players: $('#Players'),
    MaxPlayers: $('#MaxPlayers'),
    // Latency: $('#Latency'),
    title: $('#title'),
    Image: $('#Image'),
    ImageLabel: $('#ImageLabel'),
    minecraftPort: $('#minecraftPort'),
    AppLocation: $('#AppLocation'),
    AppLocationBox: $('#AppLocationBox'),
    AppLocationLabel: $('#AppLocationLabel')
};

const changeLaunch = () => {
    console.log($dom.Launch.checked);
    if ($dom.Launch.checked) {
        $dom.AppLocationBox.style.display = 'block';
    } else {
        $dom.AppLocationBox.style.display = 'none';
    }
    $settings.Launch = $dom.Launch.checked;
}

const titleInput = () => {
    $settings.Title = $dom.title.value;
}

const saveClick = () => {
    console.log('$dom.serverHostname.value', $dom.serverName.value)
    $settings.Hostname = $dom.serverName.value;
    $settings.isConnect = true
}

const portChange = () => {
    $settings.minecraftPort = $dom.minecraftPort.value;
}

const triggerFile = () => {
    $dom.Image.click();
}
const triggerFile2 = () => {
    $dom.AppLocation.click();
}

const playersChange = () => {
    $settings.hiddenPlayers = $dom.Players.checked;
}

const maxChange = () => {
    $settings.hiddenMaxPlayers = $dom.MaxPlayers.checked;
}

$emit.on("File-Image", (urls) => {
    
    $dom.ImageLabel.textContent = urls[0]|| '';
    $settings.Image = urls[0]|| ''
})

$emit.on('File-AppLocation', (urls) => {
    console.log('urls', urls);
    $dom.AppLocationLabel.textContent = urls[0]|| '';
    $settings.AppLocationPath = urls[0]|| '';
})

const $propEvent = {
    didReceiveGlobalSettings({ settings }) {
    },
    didReceiveSettings(data) {
        $dom.serverName.value = $settings.Hostname;
        $dom.minecraftPort.value = $settings.minecraftPort;
        $dom.title.value = $settings.Title;
        $dom.ImageLabel.textContent = $settings.Image;
        $dom.Players.checked = $settings.hiddenPlayers;
        $dom.MaxPlayers.checked = $settings.hiddenMaxPlayers;
        $dom.Launch.checked = $settings.Launch;
        if ($dom.Launch.checked) {
            $dom.AppLocationBox.style.display = 'block';
        } else {
            $dom.AppLocationBox.style.display = 'none';
        }
        $dom.AppLocationLabel.textContent = $settings.AppLocationPath;
    },
    sendToPropertyInspector(data) {
    }
};