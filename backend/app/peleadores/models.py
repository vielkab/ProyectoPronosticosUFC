from __future__ import annotations

from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import Column, Integer, Float, String

from app.core.base import Base


class Peleador(Base):
    __tablename__ = "peleadores"

    id = Column(Integer, primary_key=True)

    nombre = Column(String(140), unique=True, nullable=False)

    altura_cm = Column(Float)
    alcance_cm = Column(Float)

    victorias = Column(Integer)
    derrotas = Column(Integer)
    empates = Column(Integer)
    wins_dq = Column(Integer)

    striking_accuracy = Column(Float)
    striking_defense = Column(Float)

    wins_ko_tko = Column(Integer)
    wins_submission = Column(Integer)
    wins_decision = Column(Integer)

    wins_round_1 = Column(Integer)
    wins_round_2 = Column(Integer)
    wins_round_3 = Column(Integer)
    wins_round_4 = Column(Integer)
    wins_round_5 = Column(Integer)