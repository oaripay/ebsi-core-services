pipeline {
  agent any
  stages {
    stage('SCM') {
      steps {
        checkout(scm)

        checkout(scm: [
            $class: 'GitSCM',
            branches: [ [name: 'develop'] ],
            userRemoteConfigs: [ [url: 'https://ebsi1-robot@ec.europa.eu/digital-building-blocks/code/scm/ebsi/qa-testing.git', credentialsId: 'b257a49a-5fed-4971-a6df-e05d3200edc0'] ],
            extensions: [
                [$class: 'RelativeTargetDirectory', relativeTargetDir: "automation"],
          ],
          poll: false
        ])
      }
    }
    stage('SmartContract Testing') {
      steps {
          sh "automation/SmartContractFuncTests.sh"
      }
    }
  }
  post {
    always {
      cleanWs()
      dir("${env.WORKSPACE}@script") {
        deleteDir()
      }
    }
  }
}
