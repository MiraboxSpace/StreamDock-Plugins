// Licensed to the Chroma Control Contributors under one or more agreements.
// The Chroma Control Contributors licenses this file to you under the MIT license.
// See the LICENSE file in the project root for more information.

using ChromaControl.SDK.Synapse.Enums;
//using Microsoft.Extensions.Logging;
using System.Drawing;
//using System.IO;
using System.Net.Sockets;
//using System.Text;
//using Windows.Media.Protection.PlayReady;
//using ChromaControl.SDK.Synapse.Sample;

namespace ChromaControl.SDK.Synapse.Sample;

/// <summary>
/// The worker.
/// </summary>
public partial class Worker : BackgroundService
{
    private bool _serviceReady;
    /********************************/
    private readonly Color[] _cachedColor;
    /********************************/
    private bool _change;
    //private readonly ILogger<Worker> _logger;
    private readonly ISynapseService _service;
    private readonly int[] _r;
    private readonly int[] _g;
    private readonly int[] _b;

    private readonly TcpClient? _client;
    private readonly NetworkStream? _stream;

    //[LoggerMessage(EventId = 0, Level = LogLevel.Information, Message = "Failed to send color data through shared memory", EventName = "SynapseStarting")]
    //private static partial void LogMessage(ILogger logger);

    //[LoggerMessage(EventId = 0, Level = LogLevel.Information, Message = "Color changed to [i = {i},R = {r}, G = {g}, B = {b}]", EventName = "ChangingColor")]
    //private static partial void LogColorChangedMessage(ILogger logger, int i, int r, int g, int b);

    /// <summary>
    /// Creates a <see cref="Worker"/> instance.
    /// </summary>
    /// <param name="service">The <see cref="ISynapseService"/>.</param>
    public Worker(ISynapseService service)
    {
        //_logger = logger;
        _service = service;
        /********************************/
        _cachedColor = new Color[5];
        _r = new int[5];
        _g = new int[5];
        _b = new int[5];
        /********************************/
        _service.StatusChanged += OnStatusChanged;
        _service.ColorsReceived += OnColorsReceived;

        try
        {
            _client = new TcpClient("127.0.0.1", 6666);

            if (_client.Connected)
            {
                Console.WriteLine("[Client] 已连接到服务端 127.0.0.1:6666");
                _stream = _client.GetStream();
            }
            else
            {
                Console.WriteLine("[Client] 连接失败");
            }
        }
        catch (SocketException ex)
        {
            Console.WriteLine($"[Client] 连接服务器失败: {ex.Message}");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Client] 出现异常: {ex.Message}");
        }
    }

    /// <inheritdoc/>
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        //var currentColor = _cachedColor;

        while (!stoppingToken.IsCancellationRequested)
        {
            if (!_serviceReady)
            {
                await Task.Delay(1000, stoppingToken);
                continue;
            }

            if (_change)
            {
                _change = false;
                for (var i = 0; i < 5; i++)
                {
                    //LogColorChangedMessage(_logger, i, _cachedColor[i].R, _cachedColor[i].G, _cachedColor[i].B);
                    _r[i] = _cachedColor[i].R;
                    _g[i] = _cachedColor[i].G;
                    _b[i] = _cachedColor[i].B;
                }

                /********************************/

                // 假设 _r, _g, _b 长度都是 5
                var length = _r.Length;
                var data = new byte[length * 3];

                for (var i = 0; i < length; i++)
                {
                    data[(i * 3) + 0] = (byte)_r[i]; // R
                    data[(i * 3) + 1] = (byte)_g[i]; // G
                    data[(i * 3) + 2] = (byte)_b[i]; // B
                }

                if (_stream != null)
                {
                    _stream.Write(data, 0, data.Length);
                    Console.WriteLine($"[client send] 发送了 {length} 个 RGB 颜色，总字节数={data.Length}");
                }
                else
                {
                    Console.WriteLine("[Client] 发送失败：_stream 未初始化");
                }
                /********************************/
            }

            await Task.Delay(0, stoppingToken);
        }
    }

    private void OnStatusChanged(object? sender, SynapseStatus e)
    {
        _serviceReady = true;
    }

    private void OnColorsReceived(object? sender, Color[] e)
    {
        for (var i = 0; i < 5; i++)
        {
            _cachedColor[i] = e[i];
        }

        _change = true;
    }
}
