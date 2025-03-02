#!/usr/bin/env python3
import os
import sys
import argparse
import subprocess
import tempfile

import whisper
import ffmpeg


def transcribe_audio_to_srt(audio_path: str, model_name: str = "base") -> str:
    """
    Verwendet OpenAI Whisper, um eine Audiodatei zu transkribieren
    und erzeugt daraus ein SRT-Format (als String).
    """
    model = whisper.load_model(model_name)
    result = model.transcribe(audio_path)

    # SRT-Datei aus den Segmenten erstellen
    srt_content = []
    for i, segment in enumerate(result["segments"], start=1):
        start = segment["start"]
        end = segment["end"]
        text = segment["text"].strip()

        # Zeit in SRT-Format umwandeln (HH:MM:SS,mmm)
        def srt_timestamp(seconds: float) -> str:
            hours = int(seconds // 3600)
            minutes = int((seconds % 3600) // 60)
            secs = int(seconds % 60)
            millis = int((seconds - int(seconds)) * 1000)
            return f"{hours:02}:{minutes:02}:{secs:02},{millis:03}"

        start_ts = srt_timestamp(start)
        end_ts = srt_timestamp(end)

        srt_content.append(f"{i}")
        srt_content.append(f"{start_ts} --> {end_ts}")
        srt_content.append(text)
        srt_content.append("")  # Leerzeile nach jedem Block

    return "\n".join(srt_content)


def extract_audio_from_video(video_path: str, audio_path: str) -> None:
    """
    Extrahiert die Audiospur aus einem Video mithilfe von ffmpeg.
    """
    (
        ffmpeg
        .input(video_path)
        .output(audio_path, ac=1, ar="16k")  # Mono, 16kHz
        .overwrite_output()
        .run(quiet=True)
    )


def burn_subtitles_into_video(
    video_path: str, 
    subtitle_path: str, 
    output_path: str,
    font_path: str = None
):
    """
    Brennt die Untertitel mit ffmpeg ins Video ein.
    Optional kann eine benutzerdefinierte Schrift angegeben werden.
    """
    # Für das ffmpeg-Filter-Argument: 
    # force_style='Fontname=...,Fontsize=...,PrimaryColour=..., etc.'
    # Hier FontFile angeben, wenn verfügbar:
    if font_path is not None:
        # Der FontFile-Parameter erfordert den absoluten Pfad
        abs_font_path = os.path.abspath(font_path)
        subtitles_filter = f"subtitles={subtitle_path}:force_style='FontName=CustomFont,FontFile={abs_font_path},FontSize=36'"
    else:
        # Ohne explizite Schriftdatei
        subtitles_filter = f"subtitles={subtitle_path}"

    (
        ffmpeg
        .input(video_path)
        .filter_(subtitles_filter)
        .output(output_path, c="libx264", preset="medium", crf=18)
        .overwrite_output()
        .run()
    )


def main():
    parser = argparse.ArgumentParser(
        description="Automatisch Untertitel aus Video extrahieren und ins Video einbetten."
    )
    parser.add_argument(
        "--input", 
        required=True, 
        help="Pfad zum Eingabe-Video (z.B. video.mp4)"
    )
    parser.add_argument(
        "--output", 
        required=True, 
        help="Pfad zum Ausgabe-Video (z.B. video_subtitled.mp4)"
    )
    parser.add_argument(
        "--font", 
        required=False, 
        help="Pfad zur Schriftdatei (z.B. ./fonts/MyCustomFont.ttf)"
    )
    parser.add_argument(
        "--model",
        default="base",
        help="Name des Whisper-Modells (z.B. tiny, base, small, medium, large)"
    )

    args = parser.parse_args()

    input_video = args.input
    output_video = args.output
    font_file = args.font
    model_name = args.model

    if not os.path.isfile(input_video):
        print(f"Fehler: Eingabedatei {input_video} existiert nicht.")
        sys.exit(1)

    # Temporäre Dateien für Audio und SRT
    with tempfile.TemporaryDirectory() as tmpdir:
        audio_path = os.path.join(tmpdir, "audio.wav")
        srt_path = os.path.join(tmpdir, "output.srt")

        # 1) Audio aus Video extrahieren
        extract_audio_from_video(input_video, audio_path)

        # 2) Spracherkennung -> SRT erzeugen
        srt_text = transcribe_audio_to_srt(audio_path, model_name=model_name)

        # 3) SRT-Datei speichern
        with open(srt_path, "w", encoding="utf-8") as f:
            f.write(srt_text)

        # 4) Untertitel ins Video brennen
        burn_subtitles_into_video(
            video_path=input_video, 
            subtitle_path=srt_path, 
            output_path=output_video,
            font_path=font_file
        )

    print(f"Fertig! Ausgabedatei: {output_video}")


if __name__ == "__main__":
    main()
