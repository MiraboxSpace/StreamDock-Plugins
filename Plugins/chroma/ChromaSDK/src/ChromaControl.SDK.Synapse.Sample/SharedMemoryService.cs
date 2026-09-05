// Licensed to the Chroma Control Contributors under one or more agreements.
// The Chroma Control Contributors licenses this file to you under the MIT license.
// See the LICENSE file in the project root for more information.

using System.IO.MemoryMappedFiles;
using System.Runtime.InteropServices;
//using System.Threading;
//using Microsoft.Extensions.Hosting;
//using Microsoft.Extensions.Logging;
//using System;

namespace ChromaControl.SDK.Synapse.Sample;
/// <summary>
/// The SharedMemoryService.
/// </summary>
public partial class SharedMemoryService : IHostedService, IDisposable
{
    private const string SHARED_MEM_NAME = "ChromaControlSharedMemory";
    private const string SHARED_MUTEX_NAME = "ChromaControlMutex";
    private const string SHARED_EVENT_NAME = "ChromaControlEvent";

    //[LoggerMessage(EventId = 0, Level = LogLevel.Information, Message = "RGB Share service started", EventName = "RGBShare")]
    //private static partial void LogInformation(ILogger logger);

    //[LoggerMessage(EventId = 0, Level = LogLevel.Information, Message = "Color send to [R = {r}, G = {g}, B = {b}]", EventName = "Debug")]
    //private static partial void LogDebug(ILogger logger, int r, int g, int b);

    [LoggerMessage(EventId = 0, Level = LogLevel.Information, Message = "Send RGB Data Fail", EventName = "Error")]
    private static partial void LogError(ILogger logger);

    // /// <summary>
    // /// Represents a color in RGB format with a data-ready flag.
    // /// </summary>
    //[StructLayout(LayoutKind.Sequential)]
    //public struct ColorData
    //{
    //    /// <summary>
    //    /// The red component of the color (0-255).
    //    /// </summary>
    //    public int[] _r = new int[5];
    //    //public fixed int _r[5];

    //    /// <summary>
    //    /// The green component of the color (0-255).
    //    /// </summary>
    //    public int[] _g = new int[5];
    //    //public fixed int _g[5];

    //    /// <summary>
    //    /// The blue component of the color (0-255).
    //    /// </summary>
    //    public int[] _b = new int[5];
    //    //public fixed int _b[5];

    //    /// <summary>
    //    /// The Data is Ready.
    //    /// </summary>
    //    public bool _isDataReady;

    //    /// <summary>
    //    /// ColorData 构造
    //    /// </summary>
    //    public ColorData()
    //    {
    //        _r = new int[5];
    //        _g = new int[5];
    //        _b = new int[5];
    //    }
    //}

    /// <summary>
    /// Represents a color in RGB format with a data-ready flag.
    /// </summary>
    [StructLayout(LayoutKind.Sequential, Pack = 1)]
    public unsafe struct ColorData
    {
        /// <summary>
        /// Represents a color in RGB format with a data-ready flag.
        /// </summary>
        public fixed int _r[5];   // 0 ~ 19
        /// <summary>
        /// Represents a color in RGB format with a data-ready flag.
        /// </summary>
        public fixed int _g[5];   // 20 ~ 39
        /// <summary>
        /// Represents a color in RGB format with a data-ready flag.
        /// </summary>
        public fixed int _b[5];   // 40 ~ 59
        /// <summary>
        /// Represents a color in RGB format with a data-ready flag.
        /// </summary>
        public byte _isDataReady; // 60

        //// 构造函数必须手动初始化数组
        ///// <summary>
        ///// Represents a color in RGB format with a data-ready flag.
        ///// </summary>
        //public ColorData()
        //{
        //    _r = new int[5];
        //    _g = new int[5];
        //    _b = new int[5];
        //    _isDataReady = false;
        //}

        /// <summary>
        /// Represents a color in RGB format with a data-ready flag.return new ColorData();
        /// </summary>
        public static ColorData CreateInitialized()
        {
            return new ColorData();
        }
    }

    private readonly ILogger<SharedMemoryService> _logger;
    private readonly MemoryMappedFile _mmf;
    private readonly MemoryMappedViewAccessor _accessor;
    private readonly Mutex _mutex;
    private readonly EventWaitHandle _dataReadyEvent;
    private CancellationTokenSource? _cts;
    private readonly int _colorDataSize = Marshal.SizeOf(typeof(ColorData));
    /// <summary>
    /// Creates a <see cref="SharedMemoryService"/> instance.
    /// </summary>
    public SharedMemoryService(ILogger<SharedMemoryService> logger)
    {
        _logger = logger;

        //LogInformation(_logger);
        // 创建或打开共享内存(大小正好是ColorData结构体的大小)
        _mmf = MemoryMappedFile.CreateOrOpen(
            SHARED_MEM_NAME,
            _colorDataSize,
            MemoryMappedFileAccess.ReadWrite);

        //LogInformation(_logger);

        _accessor = _mmf.CreateViewAccessor(0, Marshal.SizeOf(typeof(ColorData)));

        //LogInformation(_logger);
        // 创建同步对象
        _mutex = new Mutex(false, SHARED_MUTEX_NAME);
        _dataReadyEvent = new EventWaitHandle(false, EventResetMode.AutoReset, SHARED_EVENT_NAME);
    }

    /// <summary>
    /// Starts the service.
    /// </summary>
    /// <param name="cancellationToken">The <see cref="CancellationToken"/>.</param>
    /// <returns>A <see cref="Task"/> representing the worker starting.</returns>
    public Task StartAsync(CancellationToken cancellationToken)
    {

        //LogInformation(_logger);
        _cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        return Task.CompletedTask;
    }

    /// <summary>
    ///  Send Color to C++.
    /// </summary>
    /// <param name="r">The <see cref="ColorData"/>.</param>
    /// <param name="g">The <see cref="ColorData"/>.</param>
    /// <param name="b">The <see cref="ColorData"/>.</param>
    public bool SendColor(int[] r, int[] g, int[] b)
    {
        try
        {
            //LogInformation(_logger);
            if (_mutex == null || _accessor == null || _dataReadyEvent == null)
            {
                //LogInformation(_logger);
                return false;
            }

            _mutex.WaitOne();
            //var colorData = new ColorData
            //{
            //    _isDataReady = true,
            //    _r = new int[5],  // 显式初始化
            //    _g = new int[5],
            //    _b = new int[5]
            //};
            //LogInformation(_logger);
            // 安全拷贝数据
            //Array.Copy(r, colorData._r, Math.Min(r.Length, 5));
            //Array.Copy(g, colorData._g, Math.Min(g.Length, 5));
            //Array.Copy(b, colorData._b, Math.Min(b.Length, 5));
            var colorData = ColorData.CreateInitialized();
            unsafe
            {

                // 设置 ready 标志
                colorData._isDataReady = 1;

                // 更新 r/g/b 数组
                for (var i = 0; i < Math.Min(r.Length, 5); i++)
                {
                    colorData._r[i] = r[i];
                }

                for (var i = 0; i < Math.Min(g.Length, 5); i++)
                {
                    colorData._g[i] = g[i];
                }

                for (var i = 0; i < Math.Min(b.Length, 5); i++)
                {
                    colorData._b[i] = b[i];
                }
            }

            // 序列化
            var size = Marshal.SizeOf(typeof(ColorData));
            var buffer = new byte[size];
            var ptr = Marshal.AllocHGlobal(size);

            Marshal.StructureToPtr(colorData, ptr, false);
            Marshal.Copy(ptr, buffer, 0, size);
            Marshal.FreeHGlobal(ptr);

            //LogInformation(_logger);
            // 写入共享内存
            try
            {
                _accessor.WriteArray(0, buffer, 0, buffer.Length);
                Console.WriteLine("写入成功");
            }
            catch (Exception ex)
            {
                Console.WriteLine("写入失败: " + ex.Message);
            }

            //LogInformation(_logger);

            //LogBytes(_logger, buffer.Length);
            //LogDebug(_logger, r, g, b);
            return true;
        }
        catch (Exception)
        {
            LogError(_logger);
            return false;
        }
        finally
        {
            _mutex?.ReleaseMutex();
        }
    }

    /// <summary>
    /// Starts the service.
    /// </summary>
    /// <param name="cancellationToken">The <see cref="CancellationToken"/>.</param>
    /// <returns>A <see cref="Task"/> representing the worker starting.</returns>
    public Task StopAsync(CancellationToken cancellationToken)
    {
        //_logger.LogInformation("正在停止RGB共享内存服务...");
        _cts?.Cancel();
        return Task.CompletedTask;
    }

    private bool _disposed;

    /// <summary>
    /// Starts the service.
    /// </summary>
    public void Dispose()
    {
        Dispose(true);
        GC.SuppressFinalize(this);
    }

    /// <summary>
    /// Starts the service.
    /// </summary>
    protected virtual void Dispose(bool disposing)
    {
        if (_disposed)
        {
            return;
        }

        if (disposing)
        {
            // 释放托管资源
            _accessor?.Dispose();
            _mmf?.Dispose();

            // 同步对象需要特殊处理，因为它们可能跨进程
            try
            {
                _mutex?.Dispose();
            }
            catch (Exception)
            {
                //_logger?.LogWarning(ex, "释放互斥体时出错");
            }

            try
            {
                _dataReadyEvent?.Dispose();
            }
            catch (Exception)
            {
                //_logger?.LogWarning(ex, "释放事件时出错");
            }

            _cts?.Dispose();
        }

        // 在这里可以释放非托管资源（如果有的话）

        _disposed = true;
    }
}
