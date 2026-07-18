"""Ejemplo de documentación Sphinx para vistas y modelos de Django.

Este módulo ilustra cómo documentar una vista DRF y un modelo con docstrings
compatibles con Sphinx/PDoc.
"""

from django.db import models
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView


class InstrumentoMusical(models.Model):
    """Representa un instrumento musical registrado en el sistema.

    :param nombre: Nombre del instrumento.
    :type nombre: str
    :param activo: Indica si el instrumento está disponible.
    :type activo: bool
    :raises ValueError: Si el nombre está vacío.
    :return: Instancia persistida del instrumento.
    :rtype: InstrumentoMusical
    """

    nombre = models.CharField(max_length=100)
    activo = models.BooleanField(default=True)

    def save(self, *args, **kwargs):
        if not self.nombre.strip():
            raise ValueError('El nombre del instrumento no puede estar vacío')
        super().save(*args, **kwargs)


class RegistroInstrumentoView(APIView):
    """Registra un instrumento musical en el sistema.

    :param request: Solicitud HTTP entrante con el payload del instrumento.
    :type request: rest_framework.request.Request
    :raises ValidationError: Si los datos enviados no son válidos.
    :return: Respuesta HTTP con el resultado del registro.
    :rtype: rest_framework.response.Response
    """

    def post(self, request):
        nombre = request.data.get('nombre', '').strip()
        if not nombre:
            raise ValueError('El nombre es obligatorio')

        instrumento = InstrumentoMusical.objects.create(nombre=nombre)
        return Response({'id': instrumento.id, 'nombre': instrumento.nombre}, status=status.HTTP_201_CREATED)
