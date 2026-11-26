using System;
using System.ComponentModel;
using System.Diagnostics;
using IO = System.IO;
using System.Reflection;
using System.Threading;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Data;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Animation;
using System.Windows.Media.Effects;
using System.Windows.Shapes;

[assembly: AssemblyTitle("VAEL Workstation Installer")]
[assembly: AssemblyDescription("Installer for VAEL Workstation")]
[assembly: AssemblyCompany("VAEL")]
[assembly: AssemblyProduct("VAEL Workstation")]
[assembly: AssemblyCopyright("Copyright 2026 VAEL")]
[assembly: AssemblyVersion("0.1.0.0")]
[assembly: AssemblyFileVersion("0.1.0.0")]

namespace VAELInstaller
{
    public class Program
    {
        [STAThread]
        public static void Main()
        {
            var app = new Application();
            app.ShutdownMode = ShutdownMode.OnMainWindowClose;
            app.Run(new InstallerWindow());
        }
    }

    public class InstallerWindow : Window
    {
        static readonly Color Bg0 = Color.FromRgb(0x0a, 0x0a, 0x0b);
        static readonly Color Bg1 = Color.FromRgb(0x14, 0x14, 0x16);
        static readonly Color Bg2 = Color.FromRgb(0x1e, 0x1e, 0x21);
        static readonly Color Fg0 = Color.FromRgb(0xf5, 0xf5, 0xf7);
        static readonly Color Fg1 = Color.FromRgb(0xd0, 0xd0, 0xd3);
        static readonly Color Fg2 = Color.FromRgb(0x9a, 0x9a, 0x9e);
        static readonly Color Fg3 = Color.FromRgb(0x6a, 0x6a, 0x6e);
        static readonly Color Red = Color.FromRgb(0xf8, 0x71, 0x71);

        StackPanel welcomePanel;
        StackPanel installingPanel;
        StackPanel donePanel;
        StackPanel errorPanel;
        Border progressFill;
        TextBlock statusText;
        TextBlock errorText;
        string nsisPath;
        string appExePath;
        string tempSetup;
        bool installing;

        public InstallerWindow()
        {
            Width = 440;
            Height = 340;
            WindowStyle = WindowStyle.None;
            AllowsTransparency = true;
            Background = Brushes.Transparent;
            WindowStartupLocation = WindowStartupLocation.CenterScreen;
            ResizeMode = ResizeMode.NoResize;
            Opacity = 0;

            FindSetup();
            BuildUI();
            Show("welcome");
        }

        protected override void OnContentRendered(EventArgs e)
        {
            base.OnContentRendered(e);
            BeginAnimation(OpacityProperty,
                new DoubleAnimation(0, 1, TimeSpan.FromMilliseconds(200)));
        }

        void FindSetup()
        {
            var asm = Assembly.GetExecutingAssembly();
            foreach (string name in asm.GetManifestResourceNames())
            {
                if (name.EndsWith(".exe", StringComparison.OrdinalIgnoreCase))
                {
                    tempSetup = IO.Path.Combine(IO.Path.GetTempPath(),
                        "VAEL-Setup-" + Guid.NewGuid().ToString("N").Substring(0, 8) + ".exe");
                    using (var rs = asm.GetManifestResourceStream(name))
                    using (var fs = IO.File.Create(tempSetup))
                    {
                        byte[] buf = new byte[81920];
                        int read;
                        while ((read = rs.Read(buf, 0, buf.Length)) > 0)
                            fs.Write(buf, 0, read);
                    }
                    nsisPath = tempSetup;
                    break;
                }
            }

            if (nsisPath == null)
            {
                string dir = IO.Path.GetDirectoryName(asm.Location);
                foreach (string f in IO.Directory.GetFiles(dir, "*.exe"))
                {
                    string n = IO.Path.GetFileName(f).ToLowerInvariant();
                    if (n.Contains("setup") && n.Contains("vael") &&
                        !n.Equals(IO.Path.GetFileName(asm.Location).ToLowerInvariant()))
                    {
                        nsisPath = f;
                        break;
                    }
                }
            }

            appExePath = IO.Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "Programs", "vael-workstation", "VAEL Workstation.exe");
        }

        void Cleanup()
        {
            if (tempSetup != null)
            {
                try { IO.File.Delete(tempSetup); } catch { }
                tempSetup = null;
            }
        }

        void BuildUI()
        {
            var shell = new Border
            {
                CornerRadius = new CornerRadius(16),
                Background = new SolidColorBrush(Bg0),
                BorderBrush = new SolidColorBrush(Color.FromArgb(12, 255, 255, 255)),
                BorderThickness = new Thickness(1),
                ClipToBounds = true,
                Effect = new DropShadowEffect
                {
                    Color = Colors.Black, BlurRadius = 30,
                    Opacity = 0.4, ShadowDepth = 0
                }
            };

            var root = new Grid();
            shell.Child = root;

            root.Children.Add(new Ellipse
            {
                Width = 300, Height = 300,
                HorizontalAlignment = HorizontalAlignment.Center,
                VerticalAlignment = VerticalAlignment.Top,
                Margin = new Thickness(0, -140, 0, 0),
                IsHitTestVisible = false,
                Fill = new RadialGradientBrush
                {
                    GradientStops = new GradientStopCollection
                    {
                        new GradientStop(Color.FromArgb(14, 255, 255, 255), 0),
                        new GradientStop(Color.FromArgb(4, 255, 255, 255), 0.5),
                        new GradientStop(Colors.Transparent, 1)
                    }
                }
            });

            var drag = new Rectangle
            {
                Height = 44, VerticalAlignment = VerticalAlignment.Top,
                Fill = Brushes.Transparent
            };
            drag.MouseLeftButtonDown += (s, e) => { if (e.ClickCount == 1) DragMove(); };
            root.Children.Add(drag);

            root.Children.Add(MakeCloseButton());

            welcomePanel = MakeWelcome();
            installingPanel = MakeInstalling();
            donePanel = MakeDone();
            errorPanel = MakeError();

            root.Children.Add(welcomePanel);
            root.Children.Add(installingPanel);
            root.Children.Add(donePanel);
            root.Children.Add(errorPanel);

            Content = shell;
        }

        Canvas MakeLogo(double scale)
        {
            double w = 52 * scale, h = 48 * scale;
            var cv = new Canvas { Width = w, Height = h, HorizontalAlignment = HorizontalAlignment.Center };
            double s = Math.Min(w / 180.0, h / 164.0);
            double ox = (w - 180 * s) / 2, oy = (h - 164 * s) / 2;
            var stroke = new SolidColorBrush(Fg0);

            cv.Children.Add(new Polygon
            {
                Points = new PointCollection
                {
                    new Point(ox, oy),
                    new Point(ox + 180 * s, oy),
                    new Point(ox + 90 * s, oy + 164 * s)
                },
                Stroke = stroke,
                StrokeThickness = 2.8 * scale,
                StrokeLineJoin = PenLineJoin.Round,
                Fill = Brushes.Transparent
            });

            cv.Children.Add(new Line
            {
                X1 = ox + 90 * s, Y1 = oy,
                X2 = ox + 90 * s, Y2 = oy + 98 * s,
                Stroke = stroke,
                StrokeThickness = 2.8 * scale,
                StrokeStartLineCap = PenLineCap.Round,
                StrokeEndLineCap = PenLineCap.Round
            });

            return cv;
        }

        Button MakeCloseButton()
        {
            var btn = new Button
            {
                Content = "×",
                Width = 28, Height = 28,
                HorizontalAlignment = HorizontalAlignment.Right,
                VerticalAlignment = VerticalAlignment.Top,
                Margin = new Thickness(0, 8, 8, 0),
                FontSize = 14,
                Foreground = new SolidColorBrush(Fg3),
                Background = Brushes.Transparent,
                BorderThickness = new Thickness(0),
                Cursor = Cursors.Hand,
                Template = PillTemplate(Brushes.Transparent)
            };
            btn.MouseEnter += (s, e) => btn.Foreground = new SolidColorBrush(Fg0);
            btn.MouseLeave += (s, e) => btn.Foreground = new SolidColorBrush(Fg3);
            btn.Click += (s, e) =>
            {
                if (installing &&
                    MessageBox.Show("Cancel installation?", "VAEL",
                        MessageBoxButton.YesNo, MessageBoxImage.Question) != MessageBoxResult.Yes)
                    return;
                Close();
            };
            return btn;
        }

        ControlTemplate PillTemplate(Brush bg)
        {
            var t = new ControlTemplate(typeof(Button));
            var b = new FrameworkElementFactory(typeof(Border), "bd");
            b.SetValue(Border.CornerRadiusProperty, new CornerRadius(8));
            b.SetValue(Border.BackgroundProperty, bg);
            b.SetValue(Border.PaddingProperty, new Thickness(24, 9, 24, 9));
            var cp = new FrameworkElementFactory(typeof(ContentPresenter));
            cp.SetValue(ContentPresenter.HorizontalAlignmentProperty, HorizontalAlignment.Center);
            cp.SetValue(ContentPresenter.VerticalAlignmentProperty, VerticalAlignment.Center);
            b.AppendChild(cp);
            t.VisualTree = b;

            var hover = new Trigger { Property = UIElement.IsMouseOverProperty, Value = true };
            hover.Setters.Add(new Setter(UIElement.OpacityProperty, 0.8));
            t.Triggers.Add(hover);
            return t;
        }

        Button Pill(string text, Color bg, Color fg)
        {
            return new Button
            {
                Content = text,
                FontSize = 13,
                FontFamily = new FontFamily("Segoe UI"),
                FontWeight = FontWeights.Medium,
                Foreground = new SolidColorBrush(fg),
                Background = new SolidColorBrush(bg),
                BorderThickness = new Thickness(0),
                Cursor = Cursors.Hand,
                HorizontalAlignment = HorizontalAlignment.Center,
                Template = PillTemplate(new SolidColorBrush(bg))
            };
        }

        TextBlock Label(string text, double size, Color color, FontWeight w)
        {
            return new TextBlock
            {
                Text = text, FontSize = size,
                FontFamily = new FontFamily("Segoe UI"),
                FontWeight = w,
                Foreground = new SolidColorBrush(color),
                HorizontalAlignment = HorizontalAlignment.Center,
                TextAlignment = TextAlignment.Center
            };
        }

        TextBlock Link(string text, Action onClick)
        {
            var tb = Label(text, 11, Fg3, FontWeights.Normal);
            tb.Cursor = Cursors.Hand;
            tb.MouseEnter += (s, e) => tb.Foreground = new SolidColorBrush(Fg1);
            tb.MouseLeave += (s, e) => tb.Foreground = new SolidColorBrush(Fg3);
            tb.MouseLeftButtonDown += (s, e) => onClick();
            return tb;
        }

        Border Spacer(double h) { return new Border { Height = h }; }

        StackPanel MakeWelcome()
        {
            var p = new StackPanel
            {
                VerticalAlignment = VerticalAlignment.Center,
                HorizontalAlignment = HorizontalAlignment.Center,
                Margin = new Thickness(40, 0, 40, 0)
            };

            p.Children.Add(MakeLogo(1.0));
            p.Children.Add(Spacer(18));
            p.Children.Add(Label("VAEL Workstation", 20, Fg0, FontWeights.Light));
            p.Children.Add(Spacer(6));
            p.Children.Add(Label("v0.1.0", 11, Fg3, FontWeights.Normal));
            p.Children.Add(Spacer(30));

            var btn = Pill("Install", Fg0, Bg0);
            btn.Click += (s, e) => DoInstall();
            p.Children.Add(btn);

            p.Children.Add(Spacer(12));
            p.Children.Add(Link("Cancel", Close));

            return p;
        }

        StackPanel MakeInstalling()
        {
            var p = new StackPanel
            {
                VerticalAlignment = VerticalAlignment.Center,
                HorizontalAlignment = HorizontalAlignment.Center,
                Margin = new Thickness(40, 0, 40, 0),
                Visibility = Visibility.Collapsed
            };

            p.Children.Add(MakeLogo(0.8));
            p.Children.Add(Spacer(22));
            p.Children.Add(Label("Installing…", 16, Fg0, FontWeights.Light));
            p.Children.Add(Spacer(22));

            var track = new Border
            {
                Width = 260, Height = 3,
                CornerRadius = new CornerRadius(2),
                Background = new SolidColorBrush(Bg2),
                HorizontalAlignment = HorizontalAlignment.Center
            };
            var g = new Grid();
            track.Child = g;

            progressFill = new Border
            {
                Width = 0, Height = 3,
                CornerRadius = new CornerRadius(2),
                Background = new SolidColorBrush(Fg0),
                HorizontalAlignment = HorizontalAlignment.Left
            };
            g.Children.Add(progressFill);
            p.Children.Add(track);

            p.Children.Add(Spacer(10));
            statusText = Label("Preparing…", 11, Fg2, FontWeights.Normal);
            p.Children.Add(statusText);

            return p;
        }

        StackPanel MakeDone()
        {
            var p = new StackPanel
            {
                VerticalAlignment = VerticalAlignment.Center,
                HorizontalAlignment = HorizontalAlignment.Center,
                Margin = new Thickness(40, 0, 40, 0),
                Visibility = Visibility.Collapsed
            };

            var cv = new Canvas { Width = 40, Height = 40, HorizontalAlignment = HorizontalAlignment.Center };
            cv.Children.Add(new Ellipse
            {
                Width = 40, Height = 40,
                Stroke = new SolidColorBrush(Fg0), StrokeThickness = 1.5,
                Fill = new SolidColorBrush(Color.FromArgb(8, 255, 255, 255))
            });
            cv.Children.Add(new Path
            {
                Data = Geometry.Parse("M12,20 L17,26 L28,15"),
                Stroke = new SolidColorBrush(Fg0),
                StrokeThickness = 2,
                StrokeStartLineCap = PenLineCap.Round,
                StrokeEndLineCap = PenLineCap.Round,
                StrokeLineJoin = PenLineJoin.Round
            });
            p.Children.Add(cv);

            p.Children.Add(Spacer(18));
            p.Children.Add(Label("Installed", 17, Fg0, FontWeights.Light));
            p.Children.Add(Spacer(26));

            var btn = Pill("Launch", Fg0, Bg0);
            btn.Click += (s, e) => Launch();
            p.Children.Add(btn);

            p.Children.Add(Spacer(12));
            p.Children.Add(Link("Close", Close));

            return p;
        }

        StackPanel MakeError()
        {
            var p = new StackPanel
            {
                VerticalAlignment = VerticalAlignment.Center,
                HorizontalAlignment = HorizontalAlignment.Center,
                Margin = new Thickness(40, 0, 40, 0),
                Visibility = Visibility.Collapsed
            };

            p.Children.Add(MakeLogo(0.8));
            p.Children.Add(Spacer(18));
            p.Children.Add(Label("Installation Failed", 16, Red, FontWeights.Normal));
            p.Children.Add(Spacer(6));

            errorText = Label("", 11, Fg2, FontWeights.Normal);
            errorText.TextWrapping = TextWrapping.Wrap;
            errorText.MaxWidth = 320;
            p.Children.Add(errorText);

            p.Children.Add(Spacer(22));

            var retry = Pill("Retry", Fg0, Bg0);
            retry.Click += (s, e) => DoInstall();
            p.Children.Add(retry);

            p.Children.Add(Spacer(10));
            p.Children.Add(Link("Close", Close));

            return p;
        }

        void Show(string name)
        {
            welcomePanel.Visibility = name == "welcome" ? Visibility.Visible : Visibility.Collapsed;
            installingPanel.Visibility = name == "installing" ? Visibility.Visible : Visibility.Collapsed;
            donePanel.Visibility = name == "done" ? Visibility.Visible : Visibility.Collapsed;
            errorPanel.Visibility = name == "error" ? Visibility.Visible : Visibility.Collapsed;
        }

        void Progress(double pct, double ms)
        {
            progressFill.BeginAnimation(WidthProperty,
                new DoubleAnimation(260 * pct / 100.0, TimeSpan.FromMilliseconds(ms))
                {
                    EasingFunction = new QuadraticEase { EasingMode = EasingMode.EaseInOut }
                });
        }

        void Status(string msg) { Dispatcher.Invoke(() => statusText.Text = msg); }

        void DoInstall()
        {
            if (nsisPath == null)
            {
                errorText.Text = "Setup file not found.\nPlace this installer next to the VAEL Workstation setup file.";
                Show("error");
                return;
            }

            installing = true;
            Show("installing");
            Progress(10, 400);

            var bg = new BackgroundWorker();
            bg.DoWork += (s, e) =>
            {
                Thread.Sleep(400);
                Status("Installing files…");
                Dispatcher.Invoke(() => Progress(35, 2000));

                var psi = new ProcessStartInfo
                {
                    FileName = nsisPath, Arguments = "/S",
                    UseShellExecute = false, CreateNoWindow = true
                };
                var proc = Process.Start(psi);

                Dispatcher.Invoke(() => Progress(70, 6000));
                proc.WaitForExit();

                if (proc.ExitCode != 0)
                {
                    e.Result = "Setup exited with code " + proc.ExitCode;
                    return;
                }

                Status("Finishing up…");
                Dispatcher.Invoke(() => Progress(100, 600));
                Thread.Sleep(800);
            };

            bg.RunWorkerCompleted += (s, e) =>
            {
                installing = false;
                if (e.Error != null)
                {
                    errorText.Text = e.Error.Message;
                    Show("error");
                }
                else if (e.Result != null)
                {
                    errorText.Text = e.Result.ToString();
                    Show("error");
                }
                else
                {
                    Show("done");
                }
            };

            bg.RunWorkerAsync();
        }

        protected override void OnClosed(EventArgs e)
        {
            Cleanup();
            base.OnClosed(e);
        }

        void Launch()
        {
            Cleanup();
            try { if (IO.File.Exists(appExePath)) Process.Start(appExePath); }
            catch { }
            Close();
        }
    }
}
