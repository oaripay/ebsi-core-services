FROM openjdk:8

EXPOSE 8080
#Set app home folder
ENV APP_HOME /app
#Possibility to set JVM options (https://www.oracle.com/technetwork/java/javase/tech/vmoptions-jsp-140102.html)
ENV JAVA_OPTS=""
#Create base app folder
RUN mkdir $APP_HOME
#Create folder to save configuration files
WORKDIR $APP_HOME
#Copy executable jar file from the builder image
COPY ./target/fabric-0.0.1-SNAPSHOT.jar $APP_HOME

ENTRYPOINT [ "sh", "-c", "java $JAVA_OPTS -Djava.security.egd=file:/dev/./urandom -jar fabric-0.0.1-SNAPSHOT.jar" ]

#docker build -t "ebsi_fabric_api:1.0" .