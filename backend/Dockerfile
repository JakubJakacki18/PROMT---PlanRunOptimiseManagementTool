FROM python:3.13-alpine
COPY requirements.txt /app/
WORKDIR /app
RUN pip install --upgrade pip
RUN pip install -r requirements.txt
RUN apk add --no-cache git
COPY . /app
RUN python manage.py makemigrations
#RUN python manage.py migrate
EXPOSE 8000
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
