"""
API FastAPI para conversão DOCX -> E-Book (texto com tags).
"""

from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

from app.converter import ConversionError, convert

app = FastAPI(
    title="Conversor E-Book",
    description="Converte arquivos DOCX com tags no formato E-Book (texto).",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MAX_FILE_SIZE_MB = 20
MAX_FILE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024
ALLOWED_EXTENSIONS = {".docx"}


@app.get("/")
async def root():
    return {"message": "Conversor E-Book. Use POST /convert com um arquivo .docx."}


@app.post("/convert", response_class=Response)
async def convert_ebook(file: UploadFile = File(...)):
    """
    Recebe um arquivo .docx e retorna o texto convertido (download como .txt).
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="Nome do arquivo ausente.")
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Formato não permitido. Envie um arquivo .docx.",
        )

    content = await file.read()
    if len(content) > MAX_FILE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"Arquivo muito grande. Máximo: {MAX_FILE_SIZE_MB} MB.",
        )
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Arquivo vazio.")

    try:
        result = convert(content)
    except ConversionError as e:
        raise HTTPException(status_code=422, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao converter: {e}") from e

    output_name = Path(file.filename).stem + ".txt"
    return Response(
        content=result.encode("utf-8"),
        media_type="text/plain; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="{output_name}"',
        },
    )
